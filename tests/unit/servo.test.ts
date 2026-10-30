import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAINS,
  GAIN_RANGE,
  I_LOAD,
  I_UP,
  PLANT,
  SAMPLES,
  evaluate,
  run,
  setpoint,
  simulate,
  type Gains,
} from '../../src/lib/servo';

describe('the default gains', () => {
  it('pass all three requirements with the numbers the page shows', () => {
    const { metrics, verdict, advice } = evaluate(DEFAULT_GAINS);
    expect(verdict.all).toBe(true);
    expect(metrics.overshootPct.toFixed(1)).toBe('2.7');
    expect(metrics.settlingS?.toFixed(2)).toBe('0.26');
    expect(metrics.loadErrorPct.toFixed(2)).toBe('0.51');
    expect(advice).toBe('All three requirements pass.');
  });
});

describe('the controller', () => {
  it('leaves a steady error of load / Kp without integral action', () => {
    // At rest the motor command must cancel the load, u = d, and with no
    // integrator that command comes from the error alone: e = d / Kp.
    const { metrics, verdict } = evaluate({ kp: 15, ki: 0, kd: 0.4 });
    expect(metrics.loadErrorPct).toBeCloseTo((PLANT.load / 15) * 100, 1);
    expect(verdict.load).toBe(false);
  });

  it('does not kick when the setpoint steps, because the derivative acts on the measurement', () => {
    const kp = 0.5;
    const { u } = simulate({ kp, ki: 0, kd: GAIN_RANGE.kd.max });
    // At the step the error jumps from 0 to 1, but the measurement has not
    // moved yet, so only the proportional term responds.
    expect(u[I_UP]).toBeCloseTo(kp, 6);
  });

  it('keeps the command inside the actuator limits', () => {
    const { u } = simulate({ kp: GAIN_RANGE.kp.max, ki: GAIN_RANGE.ki.max, kd: GAIN_RANGE.kd.max });
    for (const v of u) expect(Math.abs(v)).toBeLessThanOrEqual(PLANT.uMax);
  });

  it('repeats the same noise on every run, so the trace does not flicker', () => {
    const a = simulate(DEFAULT_GAINS, true).y;
    const b = simulate(DEFAULT_GAINS, true).y;
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(simulate(DEFAULT_GAINS).y));
  });
});

describe('the plant integration', () => {
  it('matches the exact solution for a held command to within 1e-10 rad', () => {
    // An independent closed loop: the same controller, but the motor advanced
    // with the exact zero-order-hold solution of tau w' = -w + f.
    const { ts, tf, tau, K, uMax } = PLANT;
    const { kp, ki, kd } = DEFAULT_GAINS;
    const a = tf / (tf + ts);
    const decay = Math.exp(-ts / tau);
    let integ = 0, dFilt = 0, yPrev = 0, th = 0, w = 0;
    const exact: number[] = [];
    for (let k = 0; k < SAMPLES; k++) {
      const r = setpoint(k);
      const e = r - th;
      dFilt = a * dFilt - (1 - a) * kd * ((th - yPrev) / ts);
      yPrev = th;
      const uRaw = kp * e + integ + dFilt;
      if (!((uRaw > uMax && e > 0) || (uRaw < -uMax && e < 0))) integ += ki * ts * e;
      const u = Math.min(uMax, Math.max(-uMax, uRaw));
      exact.push(th);
      const f = K * (u - (k >= I_LOAD ? PLANT.load : 0));
      th += f * ts + (w - f) * tau * (1 - decay);
      w = f + (w - f) * decay;
    }
    let worst = 0;
    run(DEFAULT_GAINS, false, (k, theta) => {
      worst = Math.max(worst, Math.abs(theta - (exact[k] ?? NaN)));
    });
    expect(worst).toBeLessThan(1e-10);
  });
});

/** Seeded uniform numbers in [0, 1), so the test is the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Key = keyof Gains;
const notch: Record<Key, number> = {
  kp: (GAIN_RANGE.kp.max - GAIN_RANGE.kp.min) / 20,
  ki: (GAIN_RANGE.ki.max - GAIN_RANGE.ki.min) / 20,
  kd: (GAIN_RANGE.kd.max - GAIN_RANGE.kd.min) / 20,
};

function nudge(g: Gains, key: Key, direction: 1 | -1): Gains {
  const { min, max } = GAIN_RANGE[key];
  return { ...g, [key]: Math.min(max, Math.max(min, g[key] + direction * notch[key])) };
}

/** Do what the hint says, one notch (5 % of the slider's range) at a time. */
function follow(advice: string, g: Gains): Gains {
  if (advice.endsWith('Raise Kp or lower Ki.')) {
    return g.kp < GAIN_RANGE.kp.max ? nudge(g, 'kp', 1) : nudge(g, 'ki', -1);
  }
  if (advice.endsWith('Raise Kp.')) return nudge(g, 'kp', 1);
  if (advice.endsWith('Raise Ki.')) return nudge(g, 'ki', 1);
  if (advice.endsWith('Raise Kd.')) return nudge(g, 'kd', 1);
  throw new Error(`No rule for the hint "${advice}"`);
}

describe('the tuning hints', () => {
  it('lead from 300 random starting gains to all three requirements passing', () => {
    const random = rng(2026);
    let longest = 0;
    for (let trial = 0; trial < 300; trial++) {
      let g: Gains = {
        kp: random() * GAIN_RANGE.kp.max,
        ki: random() * GAIN_RANGE.ki.max,
        kd: random() * GAIN_RANGE.kd.max,
      };
      let steps = 0;
      let state = evaluate(g);
      while (!state.verdict.all && steps < 200) {
        g = follow(state.advice, g);
        state = evaluate(g);
        steps++;
      }
      expect(state.verdict.all, `stuck at ${JSON.stringify(g)}: ${state.advice}`).toBe(true);
      longest = Math.max(longest, steps);
    }
    expect(longest).toBeLessThan(200);
  });
});
