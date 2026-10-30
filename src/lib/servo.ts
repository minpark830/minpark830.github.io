/**
 * The servo in Figure 1: a DC-motor position servo under discrete PID
 * control, simulated sample by sample at 1 kHz.
 *
 * Plant, with the load referred to the motor input:
 *     dθ/dt = ω,    τ dω/dt = −ω + K (u − d)
 * advanced by one fourth-order Runge–Kutta step per sample while the command
 * u is held (zero-order hold).
 *
 * Controller: a line-for-line port of firmware/pid.hpp. tests/unit/parity.test.ts
 * compiles that header and checks this model against it.
 *
 * Pure functions only, so the page script and the tests share one model.
 */

export interface Gains {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
}

export const PLANT = {
  /** sample period [s] */
  ts: 0.001,
  /** derivative filter time constant [s] */
  tf: 0.005,
  /** actuator limit: |u| ≤ uMax */
  uMax: 1,
  /** mechanical time constant [s] */
  tau: 0.1,
  /** velocity gain [rad/s per unit command] */
  K: 10,
  /** simulated span [s] */
  T: 2,
  /** the setpoint steps from 0 to 1 rad at [s] */
  tUp: 0.1,
  /** and back to 0 at [s] */
  tDown: 1.1,
  /** a constant load is applied at [s] */
  tLoad: 0.6,
  /** the load, in units of motor command */
  load: 0.3,
  /** standard deviation of the optional measurement noise [rad] */
  noise: 0.001,
} as const;

export const SAMPLES = Math.round(PLANT.T / PLANT.ts);
export const I_UP = Math.round(PLANT.tUp / PLANT.ts);
export const I_DOWN = Math.round(PLANT.tDown / PLANT.ts);
export const I_LOAD = Math.round(PLANT.tLoad / PLANT.ts);

export const DEFAULT_GAINS: Gains = { kp: 15, ki: 35, kd: 0.4 };

/** Slider ranges, and how many decimals each gain is shown with. */
export const GAIN_RANGE = {
  kp: { min: 0, max: 20, step: 0.1, digits: 1 },
  ki: { min: 0, max: 60, step: 0.5, digits: 1 },
  kd: { min: 0, max: 0.6, step: 0.005, digits: 3 },
} as const;

export const REQUIREMENTS = {
  /** peak overshoot of the 1 rad step [%] */
  overshootPct: 5,
  /** time to settle within 2 % of the step [s] */
  settlingS: 0.3,
  /** error 0.5 s after the load is applied [%] */
  loadErrorPct: 1,
} as const;

/** Setpoint at sample k. */
export function setpoint(k: number): number {
  return k >= I_UP && k < I_DOWN ? 1 : 0;
}

export interface Response {
  /** measured position θ [rad], one value per sample */
  readonly y: Float32Array;
  /** saturated motor command u, one value per sample */
  readonly u: Float32Array;
}

/** Seeded Gaussian noise (mulberry32 and Box–Muller), so noisy runs repeat exactly. */
function gaussianSource(seed: number): () => number {
  let s = seed;
  const uniform = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    let a = 0;
    while (a === 0) a = uniform();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * uniform());
  };
}

/**
 * Runs the loop for the whole span and hands every sample to `record` at
 * full precision: the measured position θ and the saturated command u.
 */
export function run(g: Gains, noisy: boolean, record: (k: number, theta: number, u: number) => void): void {
  const { ts, tf, uMax, tau, K } = PLANT;
  const gauss = gaussianSource(7);

  // Pid state, as in pid.hpp
  const a = tf / (tf + ts);
  let integ = 0;
  let dFilt = 0;
  let yPrev = 0;
  // plant state
  let th = 0;
  let w = 0;

  for (let k = 0; k < SAMPLES; k++) {
    const r = setpoint(k);
    const load = k >= I_LOAD ? PLANT.load : 0;
    const meas = th + (noisy ? PLANT.noise * gauss() : 0);

    // Pid::update(r, meas)
    const e = r - meas;
    const dy = (meas - yPrev) / ts;
    dFilt = a * dFilt - (1 - a) * g.kd * dy;
    yPrev = meas;
    const uRaw = g.kp * e + integ + dFilt;
    const windup = (uRaw > uMax && e > 0) || (uRaw < -uMax && e < 0);
    if (!windup) integ += g.ki * ts * e;
    const uk = Math.min(uMax, Math.max(-uMax, uRaw));

    record(k, th, uk);

    // plant: one RK4 step with the command held
    const f = K * (uk - load);
    const a1 = w;
    const b1 = (f - w) / tau;
    const a2 = w + (ts / 2) * b1;
    const b2 = (f - a2) / tau;
    const a3 = w + (ts / 2) * b2;
    const b3 = (f - a3) / tau;
    const a4 = w + ts * b3;
    const b4 = (f - a4) / tau;
    th += (ts / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    w += (ts / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    if (!Number.isFinite(th)) {
      th = 0;
      w = 0;
    }
  }
}

/** The response as compact arrays, which is all the page needs to draw it. */
export function simulate(g: Gains, noisy = false): Response {
  const y = new Float32Array(SAMPLES);
  const u = new Float32Array(SAMPLES);
  run(g, noisy, (k, theta, command) => {
    y[k] = theta;
    u[k] = command;
  });
  return { y, u };
}

export interface Metrics {
  /** peak overshoot of the step, before the load arrives [%] */
  overshootPct: number;
  /** time from the step until the response stays within 2 %; null if it never settles before the load [s] */
  settlingS: number | null;
  /** error just before the setpoint steps down, 0.5 s after the load [%] */
  loadErrorPct: number;
  /** whether the response reached 90 % of the step at all */
  reached: boolean;
}

export function measure(y: ArrayLike<number>): Metrics {
  let peak = -Infinity;
  let reached = false;
  let lastOut = -1;
  for (let k = I_UP; k < I_LOAD; k++) {
    const v = y[k] ?? 0;
    if (v > peak) peak = v;
    if (v >= 0.9) reached = true;
    if (Math.abs(v - 1) > 0.02) lastOut = k;
  }
  const settlingS =
    lastOut === I_LOAD - 1 ? null : lastOut < 0 ? 0 : (lastOut + 1 - I_UP) * PLANT.ts;
  return {
    overshootPct: Math.max(0, (peak - 1) * 100),
    settlingS,
    loadErrorPct: Math.abs(1 - (y[I_DOWN - 1] ?? 0)) * 100,
    reached,
  };
}

export interface Verdict {
  overshoot: boolean;
  settling: boolean;
  load: boolean;
  all: boolean;
}

export function judge(m: Metrics): Verdict {
  const overshoot = m.overshootPct <= REQUIREMENTS.overshootPct;
  const settling = m.settlingS !== null && m.settlingS <= REQUIREMENTS.settlingS;
  const load = m.loadErrorPct <= REQUIREMENTS.loadErrorPct;
  return { overshoot, settling, load, all: overshoot && settling && load };
}

/**
 * One manual-tuning hint at a time. The order matters: reach the target,
 * then stop the overshoot, then hold against the load, then speed up.
 * tests/unit/servo.test.ts follows these hints from random starting gains
 * and checks that they always end with every requirement passing.
 */
export function advise(m: Metrics, v: Verdict, g: Gains): string {
  if (v.all) return 'All three requirements pass.';
  if (!m.reached) return 'Position never reaches the target. Raise Kp.';
  if (!v.overshoot) {
    if (g.kd < GAIN_RANGE.kd.max - 1e-9) {
      return m.settlingS === null ? 'Still oscillating. Raise Kd.' : 'Overshooting. Raise Kd.';
    }
    return 'Overshooting at full Kd. Raise Kp or lower Ki.';
  }
  if (!v.load) return 'The load pulls it off target. Raise Ki.';
  return 'Settling too slowly. Raise Kp.';
}

/** Everything the page needs for one set of gains. */
export function evaluate(g: Gains, noisy = false) {
  const response = simulate(g, noisy);
  const metrics = measure(response.y);
  const verdict = judge(metrics);
  return { response, metrics, verdict, advice: advise(metrics, verdict, g) };
}
