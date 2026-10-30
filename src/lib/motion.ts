/**
 * Jerk-limited point-to-point moves, and what they do to a flexible payload.
 *
 * plan() finds the shortest move from rest to rest that respects limits on
 * velocity, acceleration, and jerk: seven phases of constant jerk
 * (+j, 0, −j, cruise, −j, 0, +j), the "double S" profile in Biagiotti and
 * Melchiorri, Trajectory Planning for Automatic Machines and Robots (2008),
 * section 3.4. firmware/scurve.hpp is the same planner in C++, and
 * tests/unit/motion-parity.test.ts checks that the two agree.
 *
 * The payload is a lightly damped mode riding on the axis,
 *     q'' + 2ζω q' + ω² q = −a(t),
 * where q is how far the payload lags the axis and a(t) is the axis
 * acceleration. What is left of q after the axis stops is the residual
 * vibration a machine has to wait out.
 *
 * Pure functions only, so the page script and the tests share one model.
 */

export interface Limits {
  /** velocity limit [m/s] */
  readonly v: number;
  /** acceleration limit [m/s²] */
  readonly a: number;
  /** jerk limit [m/s³] */
  readonly j: number;
}

export interface State {
  /** position [m] */
  x: number;
  /** velocity [m/s] */
  v: number;
  /** acceleration [m/s²] */
  a: number;
}

export interface Plan {
  distance: number;
  /** duration of each of the seven phases [s] */
  phases: readonly number[];
  /** jerk during each phase [m/s³] */
  jerks: readonly number[];
  /** state at the start of each phase, then at the end of the move */
  starts: readonly State[];
  /** time from start to stop [s] */
  duration: number;
  /** highest velocity reached [m/s] */
  vPeak: number;
  /** highest acceleration reached [m/s²] */
  aPeak: number;
  /** length of each jerk ramp [s] */
  ramp: number;
}

/** The move in Figure 1 of the sheet, and the payload riding on it. */
export const MOVE = {
  /** distance [m] */
  distance: 0.5,
  /** velocity limit [m/s] */
  vMax: 0.5,
  /** payload mode [Hz] */
  modeHz: 4,
  /** payload damping ratio */
  zeta: 0.03,
  /** span shown on the display [s] */
  window: 2.5,
} as const;

export const DEFAULT_LIMITS: Limits = { v: MOVE.vMax, a: 2, j: 8 };

/** Acceleration slider range [m/s²]. */
export const ACCEL_RANGE = { min: 0.5, max: 4, step: 0.1 } as const;

/**
 * Jerk spans two decades, so its slider is logarithmic: each step multiplies
 * jmax by 10^(1/250), about 0.9%, and the middle of the scale is 8 m/s³.
 */
export const JERK_SLIDER = { ref: 8, perDecade: 250, min: -150, max: 349 } as const;

export const jerkAt = (step: number): number => JERK_SLIDER.ref * 10 ** (step / JERK_SLIDER.perDecade);

export const jerkStep = (jerk: number): number =>
  Math.min(JERK_SLIDER.max, Math.max(JERK_SLIDER.min, Math.round(JERK_SLIDER.perDecade * Math.log10(jerk / JERK_SLIDER.ref))));

export const REQUIREMENTS = {
  /** the move must finish within [s] */
  durationS: 1.6,
  /** the payload may swing at most this much once the axis stops [mm] */
  residualMm: 0.1,
} as const;

function advance(s: State, j: number, dt: number): State {
  return {
    x: s.x + s.v * dt + (s.a * dt * dt) / 2 + (j * dt * dt * dt) / 6,
    v: s.v + s.a * dt + (j * dt * dt) / 2,
    a: s.a + j * dt,
  };
}

/** The shortest rest-to-rest move over `distance` [m] within the limits. */
export function plan(distance: number, lim: Limits): Plan {
  const D = Math.abs(distance);
  const { v: V, a: A, j: J } = lim;
  if (!(D > 0 && V > 0 && A > 0 && J > 0)) throw new RangeError('distance and limits must be positive');

  // First assume the move reaches the velocity limit and cruises.
  let tj: number; // jerk ramp
  let ta: number; // whole acceleration phase
  if (V * J >= A * A) {
    tj = A / J;
    ta = tj + V / A;
  } else {
    tj = Math.sqrt(V / J);
    ta = 2 * tj;
  }
  let tv = D / V - ta; // cruise
  let vPeak = V;

  if (tv < 0) {
    // Too short to cruise: find the peak velocity the distance allows.
    tv = 0;
    tj = A / J;
    vPeak = (-(A * A) / J + Math.sqrt((A * A) / J * ((A * A) / J) + 4 * D * A)) / 2;
    ta = tj + vPeak / A;
    if (ta < 2 * tj) {
      // Too short to reach the acceleration limit either.
      tj = Math.cbrt(D / (2 * J));
      ta = 2 * tj;
      vPeak = J * tj * tj;
    }
  }

  const sign = Math.sign(distance);
  const phases = [tj, ta - 2 * tj, tj, tv, tj, ta - 2 * tj, tj];
  const jerks = [J, 0, -J, 0, -J, 0, J].map((j) => sign * j);
  const starts: State[] = [{ x: 0, v: 0, a: 0 }];
  phases.forEach((dt, k) => starts.push(advance(starts[k] as State, jerks[k] ?? 0, dt)));

  return {
    distance,
    phases,
    jerks,
    starts,
    duration: 2 * ta + tv,
    vPeak,
    aPeak: J * tj,
    ramp: tj,
  };
}

/** Position, velocity, acceleration, and jerk at time t [s]. */
export function sampleAt(p: Plan, t: number): State & { j: number } {
  if (t <= 0) return { x: 0, v: 0, a: 0, j: 0 };
  let t0 = 0;
  for (let k = 0; k < 7; k++) {
    const dt = p.phases[k] ?? 0;
    if (t < t0 + dt) {
      const j = p.jerks[k] ?? 0;
      return { ...advance(p.starts[k] as State, j, t - t0), j };
    }
    t0 += dt;
  }
  return { ...(p.starts[7] as State), j: 0 };
}

/** The same move with no jerk limit: acceleration switches instantly. */
export function trapezoid(distance: number, lim: Pick<Limits, 'v' | 'a'>) {
  const D = Math.abs(distance);
  const { v: V, a: A } = lim;
  const cruises = V * V <= D * A;
  const ta = cruises ? V / A : Math.sqrt(D / A);
  const tv = cruises ? D / V - V / A : 0;
  const vPeak = A * ta;
  const duration = 2 * ta + tv;
  const sign = Math.sign(distance);
  return {
    duration,
    vPeak,
    /** acceleration at time t: +A, then 0, then −A */
    accelAt(t: number): number {
      if (t <= 0 || t >= duration) return 0;
      if (t < ta) return sign * A;
      if (t < duration - ta) return 0;
      return -sign * A;
    },
    velocityAt(t: number): number {
      if (t <= 0 || t >= duration) return 0;
      if (t < ta) return sign * A * t;
      if (t < duration - ta) return sign * vPeak;
      return sign * A * (duration - t);
    },
  };
}

export interface Payload {
  /** payload lag q, sampled every `dt` from 0 to the end of the window [m] */
  q: Float32Array;
  dt: number;
  /** swing left once the axis stops: the amplitude of q at the end of the move [m] */
  residual: number;
}

/**
 * Integrates the payload mode under the axis acceleration `accel(t)` with
 * fourth-order Runge–Kutta steps of `h`, sampling every `dt`.
 */
export function payload(
  accel: (t: number) => number,
  moveEnd: number,
  opts: { modeHz?: number; zeta?: number; window?: number; dt?: number; h?: number } = {},
): Payload {
  const w = 2 * Math.PI * (opts.modeHz ?? MOVE.modeHz);
  const z = opts.zeta ?? MOVE.zeta;
  const span = opts.window ?? MOVE.window;
  const dt = opts.dt ?? 0.001;
  const sub = Math.max(1, Math.round(dt / (opts.h ?? 0.00025)));
  const h = dt / sub;
  const n = Math.round(span / dt) + 1;
  const q = new Float32Array(n);

  const f = (t: number, x: number, xd: number): [number, number] => [xd, -accel(t) - 2 * z * w * xd - w * w * x];
  let x = 0;
  let xd = 0;
  let residual = NaN;
  const wd = w * Math.sqrt(1 - z * z);
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    q[i] = x;
    if (Number.isNaN(residual) && t >= moveEnd) {
      // Free vibration from here on: its envelope decays as exp(−ζω t), so
      // scale back to the moment the axis stopped.
      const envelope = Math.hypot(x, (xd + z * w * x) / wd);
      residual = envelope * Math.exp(z * w * (t - moveEnd));
    }
    for (let s = 0; s < sub; s++) {
      const ts = t + s * h;
      const [k1x, k1v] = f(ts, x, xd);
      const [k2x, k2v] = f(ts + h / 2, x + (h / 2) * k1x, xd + (h / 2) * k1v);
      const [k3x, k3v] = f(ts + h / 2, x + (h / 2) * k2x, xd + (h / 2) * k2v);
      const [k4x, k4v] = f(ts + h, x + h * k3x, xd + h * k3v);
      x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      xd += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    }
  }
  return { q, dt, residual: Number.isNaN(residual) ? Math.hypot(x, (xd + z * w * x) / wd) : residual };
}

export interface Verdict {
  time: boolean;
  vibration: boolean;
  all: boolean;
}

/**
 * The jerk limit that makes each jerk ramp last exactly one period of the
 * payload mode, for a given acceleration limit. A ramp that long excites the
 * mode with exactly one full cycle, which cancels itself.
 */
export function matchedJerk(lim: Pick<Limits, 'v' | 'a'>, modeHz: number = MOVE.modeHz): number {
  const period = 1 / modeHz;
  // If the move reaches the acceleration limit, the ramp is a/j; if the
  // velocity limit comes first, it is sqrt(v/j).
  return lim.v >= lim.a * period ? lim.a / period : lim.v / (period * period);
}

/** One hint at a time: settle the vibration first, then the time. */
export function advise(p: Plan, lim: Limits, v: Verdict): string {
  if (v.all) return 'Both requirements pass.';
  const periodMs = Math.round(1000 / MOVE.modeHz);
  const rampMs = Math.round(p.ramp * 1000);
  const target = matchedJerk(lim);
  if (!v.vibration) {
    const way = target < lim.j ? 'Lower' : 'Raise';
    return `Jerk ramps last ${rampMs} ms, not one ${periodMs} ms period of the payload. ${way} jmax to about ${target.toFixed(0)}.`;
  }
  // Ramps of two or more periods also cancel the vibration, but cost time.
  if (p.ramp > 1.05 / MOVE.modeHz) {
    return `Too slow: jerk ramps last ${rampMs} ms. Raise jmax to about ${target.toFixed(0)} to make them one ${periodMs} ms period.`;
  }
  return 'Too slow. Raise amax, then match jmax to it again.';
}

/** Everything the page needs for one set of limits. */
export function evaluate(lim: Limits, distance: number = MOVE.distance) {
  const p = plan(distance, lim);
  const flex = payload((t) => sampleAt(p, t).a, p.duration);
  const trap = trapezoid(distance, lim);
  const residualMm = flex.residual * 1000;
  const verdict: Verdict = {
    time: p.duration <= REQUIREMENTS.durationS + 1e-9,
    vibration: residualMm <= REQUIREMENTS.residualMm,
    all: false,
  };
  verdict.all = verdict.time && verdict.vibration;
  return { plan: p, flex, trap, residualMm, verdict, advice: advise(p, lim, verdict) };
}
