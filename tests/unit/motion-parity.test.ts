import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { plan, sampleAt } from '../../src/lib/motion';

// The planner sheet shows firmware/scurve.hpp and runs src/lib/motion.ts.
// Compile the header with embedded-style warnings and compare the two every
// millisecond. Float rounding alone accounts for about 1e-7 m.
const cxx = process.env['CXX'] ?? 'g++';
const flags = ['-std=c++17', '-O2', '-Wall', '-Wextra', '-Wpedantic', '-Wconversion', '-Wdouble-promotion', '-Werror'];

const cases: [string, number, number, number, number][] = [
  ['the move on the page', 0.5, 0.5, 2, 8],
  ['a stiff jerk limit', 0.5, 0.5, 4, 200],
  ['a move too short to cruise', 0.05, 0.5, 2, 8],
  ['a move too short to reach full acceleration', 0.002, 0.5, 4, 200],
  ['a long move in reverse', -1.7, 0.9, 3.3, 47],
];

describe('firmware/scurve.hpp', () => {
  let bin = '';

  beforeAll(() => {
    bin = join(mkdtempSync(join(tmpdir(), 'scurve-')), 'scurve_sim');
    execFileSync(cxx, [...flags, '-I', 'firmware', 'tests/cpp/scurve_sim.cpp', '-o', bin]);
  });

  it.each(cases)('plans %s like the browser model', (_name, d, v, a, j) => {
    const [first, ...rows] = execFileSync(bin, [d, v, a, j].map(String), { encoding: 'utf8' }).trim().split('\n');
    const p = plan(d, { v, a, j });
    expect(Math.abs(Number(first) - p.duration)).toBeLessThan(1e-6);
    let wx = 0;
    let wv = 0;
    let wa = 0;
    rows.forEach((row, k) => {
      const [x = NaN, vel = NaN, acc = NaN] = row.split(' ').map(Number);
      const s = sampleAt(p, k * 0.001);
      wx = Math.max(wx, Math.abs(x - s.x));
      wv = Math.max(wv, Math.abs(vel - s.v));
      wa = Math.max(wa, Math.abs(acc - s.a));
    });
    expect(wx).toBeLessThan(1e-6);
    expect(wv).toBeLessThan(1e-5);
    expect(wa).toBeLessThan(1e-4);
  });

  it('refuses a limit that is not positive', () => {
    expect(() => execFileSync(bin, ['0.5', '0.5', '0', '8'], { stdio: 'pipe' })).toThrow();
  });
});
