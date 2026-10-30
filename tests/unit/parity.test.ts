import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_GAINS, GAIN_RANGE, simulate, type Gains } from '../../src/lib/servo';

// The page shows firmware/pid.hpp and runs src/lib/servo.ts. These tests
// compile the header with the same strict flags a firmware build would use
// and check that the two agree sample by sample.
const cxx = process.env['CXX'] ?? 'g++';
const flags = ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Wpedantic', '-Werror'];

/** Largest allowed difference in position [rad]: one millionth of the 1 rad step. Float rounding alone accounts for about 1e-7. */
const TOLERANCE = 1e-6;

const cases: [string, Gains][] = [
  ['the default gains', DEFAULT_GAINS],
  ['proportional only', { kp: 4, ki: 0, kd: 0 }],
  ['every gain at its maximum', { kp: GAIN_RANGE.kp.max, ki: GAIN_RANGE.ki.max, kd: GAIN_RANGE.kd.max }],
  ['an oscillating loop', { kp: 20, ki: 60, kd: 0 }],
];

describe('firmware/pid.hpp', () => {
  let bin = '';

  beforeAll(() => {
    bin = join(mkdtempSync(join(tmpdir(), 'servo-')), 'servo_sim');
    execFileSync(cxx, [...flags, '-I', 'firmware', 'tests/cpp/servo_sim.cpp', '-o', bin]);
  });

  it.each(cases)('matches the browser model with %s', (_name, g) => {
    const out = execFileSync(bin, [String(g.kp), String(g.ki), String(g.kd)], { encoding: 'utf8' });
    const cpp = out.trim().split('\n').map(Number);
    const js = simulate(g).y;
    expect(cpp).toHaveLength(js.length);
    let worst = 0;
    cpp.forEach((v, k) => {
      worst = Math.max(worst, Math.abs(v - (js[k] ?? NaN)));
    });
    expect(worst).toBeLessThan(TOLERANCE);
  });

  it('compiles inside the timer interrupt in control_loop.cpp', () => {
    execFileSync(cxx, [...flags, '-fsyntax-only', '-I', 'firmware', '-I', 'tests/cpp/stub', 'firmware/control_loop.cpp']);
  });
});
