import { describe, expect, it } from 'vitest';
import {
  ACCEL_RANGE,
  DEFAULT_LIMITS,
  JERK_SLIDER,
  MOVE,
  evaluate,
  jerkAt,
  jerkStep,
  matchedJerk,
  payload,
  plan,
  sampleAt,
  trapezoid,
  type Limits,
} from '../../src/lib/motion';

/** Seeded uniform numbers in [0, 1), so every run checks the same cases. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Log-uniform in [lo, hi]. */
const logUniform = (r: () => number, lo: number, hi: number) => lo * (hi / lo) ** r();

function randomMoves(n: number, seed: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    d: logUniform(r, 1e-3, 3) * (r() < 0.2 ? -1 : 1),
    lim: { v: logUniform(r, 0.05, 3), a: logUniform(r, 0.1, 20), j: logUniform(r, 0.5, 2000) },
  }));
}

describe('the planner', () => {
  const moves = randomMoves(500, 2026);

  it('ends exactly at the target, at rest, for 500 random moves', () => {
    for (const { d, lim } of moves) {
      const end = sampleAt(plan(d, lim), Infinity);
      expect(Math.abs(end.x - d)).toBeLessThan(1e-12 * Math.max(1, Math.abs(d)) + 1e-15);
      expect(Math.abs(end.v)).toBeLessThan(1e-12);
      expect(Math.abs(end.a)).toBeLessThan(1e-9);
    }
  });

  it('never exceeds a limit, and only ever uses full jerk or none', () => {
    for (const { d, lim } of moves) {
      const p = plan(d, lim);
      for (const j of p.jerks) expect([0, lim.j]).toContain(Math.abs(j));
      for (let i = 0; i <= 400; i++) {
        const s = sampleAt(p, (i / 400) * p.duration);
        expect(Math.abs(s.v)).toBeLessThanOrEqual(lim.v * (1 + 1e-9));
        expect(Math.abs(s.a)).toBeLessThanOrEqual(lim.a * (1 + 1e-9));
      }
    }
  });

  it('moves smoothly: position, velocity, and acceleration are continuous at every phase change', () => {
    for (const { d, lim } of moves.slice(0, 100)) {
      const p = plan(d, lim);
      let t = 0;
      for (const dt of p.phases.slice(0, 6)) {
        t += dt;
        const before = sampleAt(p, t - 1e-9);
        const after = sampleAt(p, t + 1e-9);
        expect(Math.abs(after.x - before.x)).toBeLessThan(1e-8);
        expect(Math.abs(after.v - before.v)).toBeLessThan(1e-6);
        expect(Math.abs(after.a - before.a)).toBeLessThan(lim.j * 3e-9);
      }
    }
  });

  it('takes D/v + v/a + a/j when the move reaches both limits', () => {
    const lim: Limits = { v: 0.5, a: 2, j: 8 };
    const p = plan(0.5, lim);
    expect(p.vPeak).toBe(lim.v);
    expect(p.aPeak).toBe(lim.a);
    expect(p.duration).toBeCloseTo(0.5 / lim.v + lim.v / lim.a + lim.a / lim.j, 12);
  });

  it('costs exactly a/j more time than the same move with no jerk limit', () => {
    const lim: Limits = { v: 0.5, a: 2, j: 8 };
    const extra = plan(0.5, lim).duration - trapezoid(0.5, lim).duration;
    expect(extra).toBeCloseTo(lim.a / lim.j, 12);
  });

  it('is never faster than the move with no jerk limit', () => {
    for (const { d, lim } of moves) {
      expect(plan(d, lim).duration).toBeGreaterThanOrEqual(trapezoid(d, lim).duration - 1e-12);
    }
  });

  it('mirrors a move in the negative direction', () => {
    const fwd = plan(0.5, DEFAULT_LIMITS);
    const back = plan(-0.5, DEFAULT_LIMITS);
    expect(back.duration).toBe(fwd.duration);
    expect(sampleAt(back, 0.7).x).toBeCloseTo(-sampleAt(fwd, 0.7).x, 15);
  });

  it('refuses limits that are not positive', () => {
    expect(() => plan(0.5, { v: 0.5, a: 0, j: 8 })).toThrow(RangeError);
  });
});

describe('the payload', () => {
  it('is left perfectly still when each jerk ramp lasts one period of an undamped mode', () => {
    const p = plan(MOVE.distance, DEFAULT_LIMITS);
    expect(p.ramp).toBeCloseTo(1 / MOVE.modeHz, 12);
    const flex = payload((t) => sampleAt(p, t).a, p.duration, { zeta: 0 });
    expect(flex.residual).toBeLessThan(1e-12);
  });

  it('keeps swinging after a move with no jerk limit', () => {
    const trap = trapezoid(MOVE.distance, DEFAULT_LIMITS);
    const flex = payload(trap.accelAt, trap.duration);
    expect(flex.residual * 1000).toBeGreaterThan(0.2);
  });

  it('lags the axis by a/ω² while the acceleration holds steady', () => {
    // A long constant push: the damped mode settles at its static deflection.
    const w = 2 * Math.PI * MOVE.modeHz;
    const flex = payload(() => 1, 100, { window: 20 });
    expect(flex.q[flex.q.length - 1]).toBeCloseTo(-1 / (w * w), 9);
  });
});

describe('the default limits', () => {
  it('pass both requirements with the numbers the page shows', () => {
    const r = evaluate(DEFAULT_LIMITS);
    expect(r.verdict.all).toBe(true);
    expect(r.plan.duration.toFixed(2)).toBe('1.50');
    expect(r.residualMm.toFixed(2)).toBe('0.01');
    expect(Math.round(r.plan.ramp * 1000)).toBe(250);
    expect(r.advice).toBe('Both requirements pass.');
  });

  it('sit exactly on slider steps', () => {
    expect(jerkAt(jerkStep(DEFAULT_LIMITS.j))).toBe(DEFAULT_LIMITS.j);
    expect(jerkAt(JERK_SLIDER.min)).toBeCloseTo(2, 1);
    expect(jerkAt(JERK_SLIDER.max)).toBeCloseTo(200, -1);
    expect((DEFAULT_LIMITS.a - ACCEL_RANGE.min) / ACCEL_RANGE.step % 1).toBeCloseTo(0, 9);
  });
});

describe('the hints', () => {

  it('lead from 300 random starting limits to both requirements passing', () => {
    const r = rng(7);
    for (let trial = 0; trial < 300; trial++) {
      let a = ACCEL_RANGE.min + Math.round((r() * (ACCEL_RANGE.max - ACCEL_RANGE.min)) / ACCEL_RANGE.step) * ACCEL_RANGE.step;
      let j = jerkAt(JERK_SLIDER.min + Math.floor(r() * (JERK_SLIDER.max - JERK_SLIDER.min + 1)));
      let steps = 0;
      let state = evaluate({ v: MOVE.vMax, a, j });
      while (!state.verdict.all && steps < 60) {
        if (state.advice.includes('jmax to about')) {
          // "Lower/Raise jmax to about N": move the slider to the step nearest N.
          j = jerkAt(jerkStep(matchedJerk({ v: MOVE.vMax, a })));
        } else if (state.advice.includes('Raise amax')) {
          a = Math.min(ACCEL_RANGE.max, a + ACCEL_RANGE.step);
        } else {
          throw new Error(`No rule for the hint "${state.advice}"`);
        }
        state = evaluate({ v: MOVE.vMax, a, j });
        steps++;
      }
      expect(state.verdict.all, `stuck at a=${a}, j=${j}: ${state.advice}`).toBe(true);
    }
  });
});
