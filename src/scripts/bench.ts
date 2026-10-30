/**
 * Figure 1: draws the scope and wires the gain sliders to the servo model.
 * The model itself lives in src/lib/servo.ts so the tests can share it.
 */
import {
  DEFAULT_GAINS,
  GAIN_RANGE,
  PLANT,
  SAMPLES,
  evaluate,
  type Gains,
} from '../lib/servo';

type Key = keyof Gains;
const KEYS: Key[] = ['kp', 'ki', 'kd'];
/** Width of each number in gains.hpp, so the comments stay lined up. */
const CODE_WIDTH: Record<Key, number> = { kp: 4, ki: 4, kd: 5 };
/** Plot ranges: position in the main panel, command in the strip below. */
const Y_MIN = -0.25;
const Y_MAX = 1.5;
const U_LIM = 1.25;
const NB = '\u202f';

interface Geometry {
  pw: number;
  X: (t: number) => number;
  Ym: (v: number) => number;
  Ys: (v: number) => number;
}

type State = ReturnType<typeof evaluate> & { gains: Gains; noisy: boolean; summary: string };

const one = (v: number): string => (Math.round(v * 10) / 10).toString();

function need<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Figure 1 is missing ${selector}`);
  return el;
}

export function mountBench(): void {
  const fig = document.getElementById('bench');
  if (!fig) return;
  const svg = need<SVGSVGElement>(fig, '#scope-svg');
  const plot = need<HTMLElement>(fig, '#plot');
  const inputs = Object.fromEntries(KEYS.map((k) => [k, need<HTMLInputElement>(fig, `#${k}`)])) as Record<Key, HTMLInputElement>;
  const outs = Object.fromEntries(KEYS.map((k) => [k, need<HTMLOutputElement>(fig, `#${k}-out`)])) as Record<Key, HTMLOutputElement>;
  const code = Object.fromEntries(KEYS.map((k) => [k, need<HTMLElement>(fig, `#c-${k}`)])) as Record<Key, HTMLElement>;
  const cells = {
    os: need<HTMLElement>(fig, '#req-os'),
    ts: need<HTMLElement>(fig, '#req-ts'),
    ld: need<HTMLElement>(fig, '#req-ld'),
  };
  const noiseBox = need<HTMLInputElement>(fig, '#noise');
  const resetBtn = need<HTMLButtonElement>(fig, '#reset');
  const ghostLegend = need<HTMLElement>(fig, '#lg-ghost');
  const advice = need<HTMLElement>(fig, '#advice');
  const status = need<HTMLElement>(fig, '#scope-status');

  let G: Geometry | null = null;
  let cur: State | null = null;
  let ref: State | null = null;
  let interacting = false;
  let sweepId = 0;

  /** Lay out the grid, axes, and target for the plot's current width. */
  function build(): void {
    const W = Math.max(260, Math.round(plot.clientWidth));
    const H = Math.round(Math.min(330, Math.max(236, W * 0.48)));
    const padL = 30, padR = 6, padT = 6, padB = 20, gap = 10;
    const inner = H - padT - padB - gap;
    const stripH = Math.round(inner * 0.28);
    const mainH = inner - stripH;
    const x0 = padL, x1 = W - padR, pw = x1 - x0;
    const mT = padT, mB = padT + mainH, sT = mB + gap, sB = sT + stripH;
    const X = (t: number) => x0 + (t / PLANT.T) * pw;
    const Ym = (v: number) => mT + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * mainH;
    const Ys = (v: number) => sT + ((U_LIM - v) / (2 * U_LIM)) * stripH;
    G = { pw, X, Ym, Ys };

    const line = (cls: string, xa: number | string, ya: number | string, xb: number | string, yb: number | string) =>
      `<line class="${cls}" x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}"/>`;
    const text = (x: number | string, y: number | string, s: string, anchor = 'end') =>
      `<text class="ax" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;

    let s =
      '<defs>' +
      `<clipPath id="clip-main"><rect x="${x0}" y="${mT}" width="${pw}" height="${mainH}"/></clipPath>` +
      `<clipPath id="clip-strip"><rect x="${x0}" y="${sT}" width="${pw}" height="${stripH}"/></clipPath>` +
      `<clipPath id="clip-sweep"><rect id="sweep-rect" x="${x0 - 3}" y="0" width="${pw + 6}" height="${H}"/></clipPath>` +
      '</defs>';
    for (let i = 0; i <= 20; i++) {
      const x = one(X(i * 0.1));
      const cls = i % 5 === 0 ? 'g2' : 'g1';
      s += line(cls, x, mT, x, mB) + line(cls, x, sT, x, sB);
    }
    for (const v of [-0.25, 0.25, 0.75, 1.25]) s += line('g1', x0, one(Ym(v)), x1, one(Ym(v)));
    for (const v of [0, 0.5, 1]) s += line('g2', x0, one(Ym(v)), x1, one(Ym(v)));
    s += line('g2', x0, one(Ys(0)), x1, one(Ys(0)));
    for (const v of [1, -1]) s += line('lim-line', x0, one(Ys(v)), x1, one(Ys(v)));
    s += `<rect class="pframe" x="${x0}" y="${mT}" width="${pw}" height="${mainH}"/>`;
    s += `<rect class="pframe" x="${x0}" y="${sT}" width="${pw}" height="${stripH}"/>`;

    for (const [v, label] of [[0, '0'], [0.5, '0.5'], [1, '1.0']] as const) s += text(x0 - 5, one(Ym(v) + 3.5), label);
    for (const [v, label] of [[1, '+1'], [-1, '−1']] as const) s += text(x0 - 5, one(Ys(v) + 3.5), label);
    for (const [t, label, anchor] of [[0, '0', 'start'], [0.5, '0.5', 'middle'], [1, '1.0', 'middle'], [1.5, '1.5', 'middle'], [2, '2.0 s', 'end']] as const) {
      s += text(one(X(t)), H - 5, label, anchor);
    }
    s += text(x0 + 7, mT + 15, 'position, rad', 'start');
    s += text(x1 - 7, one(Ys(-1) - 5), 'motor command', 'end');

    const xl = one(X(PLANT.tLoad));
    s += line('load-line', xl, mT, xl, mB);
    s += text(one(X(PLANT.tLoad) + 6), mB - 8, 'load step', 'start');

    s +=
      `<path class="tr-target" clip-path="url(#clip-main)" d="M${one(X(0))},${one(Ym(0))}H${one(X(PLANT.tUp))}` +
      `V${one(Ym(1))}H${one(X(PLANT.tDown))}V${one(Ym(0))}H${one(X(PLANT.T))}"/>`;
    s +=
      '<g clip-path="url(#clip-sweep)">' +
      '<path id="p-ghost" class="tr-ghost" clip-path="url(#clip-main)" d=""/>' +
      '<path id="p-cmd" class="tr-cmd" clip-path="url(#clip-strip)" d=""/>' +
      '<path id="p-pos" class="tr-pos" clip-path="url(#clip-main)" d=""/>' +
      '</g>';
    s += '<circle id="beam" class="beam" r="3.5" cx="0" cy="0" visibility="hidden"/>';

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = s;
  }

  /** An SVG path through every sample, thinned to about 1.5 points per pixel. */
  function trace(arr: Float32Array, Yf: (v: number) => number, lo: number, hi: number): string {
    if (!G) return '';
    const step = Math.max(1, Math.floor(SAMPLES / (G.pw * 1.5)));
    const clamp = (v: number) => (v < lo ? lo : v > hi ? hi : v);
    let d = '';
    for (let k = 0; k < SAMPLES; k += step) {
      d += `${k ? 'L' : 'M'}${one(G.X(k * PLANT.ts))},${one(Yf(clamp(arr[k] ?? 0)))}`;
    }
    return d + `L${one(G.X(PLANT.T))},${one(Yf(clamp(arr[SAMPLES - 1] ?? 0)))}`;
  }

  function paint(): void {
    if (!G || !cur) return;
    const posRange = [Y_MIN - 0.6, Y_MAX + 0.6] as const;
    svg.querySelector('#p-pos')?.setAttribute('d', trace(cur.response.y, G.Ym, ...posRange));
    svg.querySelector('#p-cmd')?.setAttribute('d', trace(cur.response.u, G.Ys, -1.4, 1.4));
    const showGhost = ref !== null && !same(ref, cur);
    svg.querySelector('#p-ghost')?.setAttribute('d', showGhost && ref ? trace(ref.response.y, G.Ym, ...posRange) : '');
    ghostLegend.hidden = !showGhost;
  }

  const same = (a: State, b: State) =>
    a.gains.kp === b.gains.kp && a.gains.ki === b.gains.ki && a.gains.kd === b.gains.kd && a.noisy === b.noisy;

  function setCell(el: HTMLElement, text: string, pass: boolean): void {
    el.classList.toggle('pass', pass);
    el.classList.toggle('fail', !pass);
    const num = el.querySelector('.num');
    const word = el.querySelector('.st-word');
    if (num) num.textContent = text;
    if (word) word.textContent = pass ? 'Pass' : 'Fail';
  }

  function readGains(): Gains {
    return { kp: Number(inputs.kp.value), ki: Number(inputs.ki.value), kd: Number(inputs.kd.value) };
  }

  function update(): void {
    const gains = readGains();
    const noisy = noiseBox.checked;
    const r = evaluate(gains, noisy);
    const { metrics: m, verdict: v } = r;

    for (const key of KEYS) {
      const el = inputs[key];
      const { min, max, digits } = GAIN_RANGE[key];
      el.style.setProperty('--pct', `${(((gains[key] - min) / (max - min)) * 100).toFixed(2)}%`);
      const txt = gains[key].toFixed(digits);
      outs[key].textContent = txt;
      code[key].textContent = `${txt.padStart(CODE_WIDTH[key])}f`;
    }

    setCell(cells.os, m.overshootPct >= 99.95 ? '>99%' : `${m.overshootPct.toFixed(1)}%`, v.overshoot);
    setCell(cells.ts, m.settlingS === null ? `>0.50${NB}s` : `${m.settlingS.toFixed(2)}${NB}s`, v.settling);
    setCell(cells.ld, m.loadErrorPct >= 99.995 ? '>99%' : `${m.loadErrorPct.toFixed(2)}%`, v.load);
    advice.textContent = r.advice;
    advice.classList.toggle('ok', v.all);

    const summary =
      `Overshoot ${m.overshootPct.toFixed(1)} percent, ${v.overshoot ? 'pass' : 'fail'}. ` +
      `Settling time ${m.settlingS === null ? 'over 0.5 seconds' : `${m.settlingS.toFixed(2)} seconds`}, ${v.settling ? 'pass' : 'fail'}. ` +
      `Error under load ${m.loadErrorPct.toFixed(2)} percent, ${v.load ? 'pass' : 'fail'}. ${r.advice}`;
    cur = { ...r, gains, noisy, summary };
    paint();
  }

  const announce = () => {
    if (cur) status.textContent = cur.summary;
  };

  function stopSweep(): void {
    sweepId++;
    svg.querySelector('#sweep-rect')?.setAttribute('width', String((G?.pw ?? 0) + 6));
    svg.querySelector('#beam')?.setAttribute('visibility', 'hidden');
  }

  function beginInteraction(): void {
    stopSweep();
    if (!interacting) {
      ref = cur;
      interacting = true;
    }
  }

  for (const key of KEYS) {
    inputs[key].addEventListener('input', () => {
      beginInteraction();
      update();
    });
    inputs[key].addEventListener('change', () => {
      interacting = false;
      announce();
    });
  }
  noiseBox.addEventListener('change', () => {
    stopSweep();
    ref = cur;
    interacting = false;
    update();
    announce();
  });
  resetBtn.addEventListener('click', () => {
    stopSweep();
    ref = cur;
    interacting = false;
    for (const key of KEYS) inputs[key].value = String(DEFAULT_GAINS[key]);
    update();
    announce();
  });

  /** One sweep on arrival, like a scope trace being drawn. */
  function sweep(): void {
    const rect = svg.querySelector('#sweep-rect');
    const beam = svg.querySelector('#beam');
    if (!rect || !beam || !G || !cur) return;
    const id = ++sweepId;
    const duration = 1600;
    let t0: number | null = null;
    rect.setAttribute('width', '0');
    beam.setAttribute('visibility', 'visible');
    const frame = (now: number) => {
      if (id !== sweepId || !G || !cur) return;
      t0 ??= now;
      const f = Math.min(1, (now - t0) / duration);
      rect.setAttribute('width', ((G.pw + 6) * f).toFixed(1));
      const k = Math.min(SAMPLES - 1, Math.floor(f * (SAMPLES - 1)));
      const v = Math.max(Y_MIN, Math.min(Y_MAX, cur.response.y[k] ?? 0));
      beam.setAttribute('cx', one(G.X(k * PLANT.ts)));
      beam.setAttribute('cy', one(G.Ym(v)));
      if (f < 1) requestAnimationFrame(frame);
      else beam.setAttribute('visibility', 'hidden');
    };
    requestAnimationFrame(frame);
  }

  build();
  update();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = plot.getBoundingClientRect();
  if (!reduce && box.top < window.innerHeight && box.bottom > 0) sweep();

  let lastW = plot.clientWidth;
  const onResize = () => {
    const w = plot.clientWidth;
    if (Math.abs(w - lastW) < 1) return;
    lastW = w;
    stopSweep();
    build();
    paint();
  };
  new ResizeObserver(onResize).observe(plot);
}
