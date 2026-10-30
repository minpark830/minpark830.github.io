/**
 * The live motion planner: draws the profile and the payload's swing, and
 * wires the limit sliders to the model in src/lib/motion.ts.
 */
import {
  ACCEL_RANGE,
  DEFAULT_LIMITS,
  JERK_SLIDER,
  MOVE,
  evaluate,
  jerkAt,
  jerkStep,
  payload,
  sampleAt,
  trapezoid,
  type Limits,
} from '../lib/motion';
import { formatJerk } from './planner-format';

const NB = ' ';
/** Fixed scales, so a bigger limit looks bigger. */
const V_TOP = MOVE.vMax * 1.3;
const A_TOP = ACCEL_RANGE.max * 1.15;
const SWING_MM = 0.5;

interface Strip {
  top: number;
  bottom: number;
  /** maps a value to a y coordinate */
  y: (v: number) => number;
}

const one = (v: number): string => (Math.round(v * 10) / 10).toString();

function need<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`The planner is missing ${selector}`);
  return el;
}

export function mountPlanner(): void {
  const fig = document.getElementById('planner');
  if (!fig) return;
  const svg = need<SVGSVGElement>(fig, '#pl-svg');
  const plot = need<HTMLElement>(fig, '#pl-plot');
  const aInput = need<HTMLInputElement>(fig, '#pl-a');
  const jInput = need<HTMLInputElement>(fig, '#pl-j');
  const aOut = need<HTMLOutputElement>(fig, '#pl-a-out');
  const jOut = need<HTMLOutputElement>(fig, '#pl-j-out');
  const aCode = need<HTMLElement>(fig, '#pl-c-a');
  const jCode = need<HTMLElement>(fig, '#pl-c-j');
  const trapBox = need<HTMLInputElement>(fig, '#pl-trap');
  const resetBtn = need<HTMLButtonElement>(fig, '#pl-reset');
  const trapLegend = need<HTMLElement>(fig, '#pl-lg-trap');
  const advice = need<HTMLElement>(fig, '#pl-advice');
  const status = need<HTMLElement>(fig, '#pl-status');
  const cells = {
    time: need<HTMLElement>(fig, '#pl-time'),
    res: need<HTMLElement>(fig, '#pl-res'),
    ramp: need<HTMLElement>(fig, '#pl-ramp'),
  };

  // The no-jerk-limit move depends only on amax, so cache it per value.
  const trapCache = new Map<number, { duration: number; v: (t: number) => number; a: (t: number) => number; swing: Float32Array }>();
  function trapFor(a: number) {
    let hit = trapCache.get(a);
    if (!hit) {
      const trap = trapezoid(MOVE.distance, { v: MOVE.vMax, a });
      const flex = payload(trap.accelAt, trap.duration);
      hit = { duration: trap.duration, v: trap.velocityAt, a: trap.accelAt, swing: flex.q };
      trapCache.set(a, hit);
    }
    return hit;
  }

  let X: (t: number) => number = (t) => t;
  let strips: Strip[] = [];
  let pw = 0;
  let right = 0;
  let current: ReturnType<typeof evaluate> | null = null;
  let lim: Limits = DEFAULT_LIMITS;

  /** Lay out four strips sharing one time axis: velocity, acceleration, jerk, swing. */
  function build(): void {
    const W = Math.max(260, Math.round(plot.clientWidth));
    const H = Math.round(Math.min(420, Math.max(300, W * 0.62)));
    const padL = 34, padR = 6, padT = 4, padB = 20, gap = 8;
    const weights = [0.27, 0.24, 0.17, 0.32];
    const inner = H - padT - padB - gap * (weights.length - 1);
    const x0 = padL;
    const x1 = W - padR;
    pw = x1 - x0;
    X = (t) => x0 + (t / MOVE.window) * pw;
    let top = padT;
    const ranges: [number, number][] = [
      [-0.12 * V_TOP, V_TOP],
      [-A_TOP, A_TOP],
      [-1.35, 1.35],
      [-SWING_MM, SWING_MM],
    ];
    strips = weights.map((w, i) => {
      const h = Math.round(inner * w);
      const [lo, hi] = ranges[i] as [number, number];
      const t0 = top;
      top += h + gap;
      return { top: t0, bottom: t0 + h, y: (v: number) => t0 + ((hi - v) / (hi - lo)) * h };
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    let s = '<defs>';
    strips.forEach((st, i) => {
      s += `<clipPath id="pl-clip-${i}"><rect x="${x0}" y="${st.top}" width="${pw}" height="${st.bottom - st.top}"/></clipPath>`;
    });
    s += `<clipPath id="pl-clip-sweep"><rect id="pl-sweep" x="${x0 - 3}" y="0" width="${pw + 6}" height="${H}"/></clipPath></defs>`;

    for (const st of strips) {
      for (let i = 0; i <= MOVE.window / 0.25; i++) {
        const x = one(X(i * 0.25));
        s += `<line class="${i % 2 === 0 ? 'g2' : 'g1'}" x1="${x}" y1="${st.top}" x2="${x}" y2="${st.bottom}"/>`;
      }
      s += `<line class="g2" x1="${x0}" y1="${one(st.y(0))}" x2="${x1}" y2="${one(st.y(0))}"/>`;
      s += `<rect class="pframe" x="${x0}" y="${st.top}" width="${pw}" height="${st.bottom - st.top}"/>`;
    }
    const text = (x: number | string, y: number | string, str: string, anchor = 'end', id = '') =>
      `<text class="ax"${id ? ` id="${id}"` : ''} x="${x}" y="${y}" text-anchor="${anchor}">${str}</text>`;
    const [sv, sa, sj, sq] = strips as [Strip, Strip, Strip, Strip];
    s += text(x0 - 5, one(sv.y(MOVE.vMax) + 3.5), MOVE.vMax.toFixed(1));
    s += text(x0 - 5, one(sv.y(0) + 3.5), '0');
    s += text(x0 - 5, one(sa.y(0) + 3.5), '0', 'end', 'pl-a0-t');
    s += text(x0 - 5, one(sq.y(0.1) + 3.5), '+0.1');
    s += text(x0 - 5, one(sq.y(-0.1) + 3.5), '−0.1');
    // lines that move with the limits
    s += `<line class="lim-line" id="pl-vlim" x1="${x0}" y1="${one(sv.y(MOVE.vMax))}" x2="${x1}" y2="${one(sv.y(MOVE.vMax))}"/>`;
    s += `<line class="lim-line" id="pl-alim-p" x1="${x0}" x2="${x1}"/><line class="lim-line" id="pl-alim-n" x1="${x0}" x2="${x1}"/>`;
    s += text(x0 - 5, 0, '', 'end', 'pl-alim-t');
    s += `<line class="lim-line" x1="${x0}" y1="${one(sj.y(1))}" x2="${x1}" y2="${one(sj.y(1))}"/>`;
    s += `<line class="lim-line" x1="${x0}" y1="${one(sj.y(-1))}" x2="${x1}" y2="${one(sj.y(-1))}"/>`;
    s += text(x0 - 5, one(sj.y(1) + 3.5), '', 'end', 'pl-jlim-t');
    s += `<line class="lim-line" x1="${x0}" y1="${one(sq.y(0.1))}" x2="${x1}" y2="${one(sq.y(0.1))}"/>`;
    s += `<line class="lim-line" x1="${x0}" y1="${one(sq.y(-0.1))}" x2="${x1}" y2="${one(sq.y(-0.1))}"/>`;
    for (const [t, label, anchor] of [[0, '0', 'start'], [0.5, '0.5', 'middle'], [1, '1.0', 'middle'], [1.5, '1.5', 'middle'], [2, '2.0', 'middle'], [2.5, '2.5 s', 'end']] as const) {
      s += text(one(X(t)), H - 5, label, anchor);
    }
    // Strip names go at top right, where the traces have usually come to rest.
    // Each sits on a tab in the screen color that hides the grid and limit
    // lines behind it. Traces pass over the tab, and the name, drawn last with
    // a halo, stays legible over them.
    const names = [[sv, 'v', 'velocity, m/s'], [sa, 'a', 'acceleration, m/s²'], [sj, 'j', 'jerk, m/s³'], [sq, 'q', 'payload swing, mm']] as const;
    for (const [st, k] of names) s += `<rect class="ax-tab" id="pl-name-${k}-tab" x="${x1}" y="${st.top}" width="0" height="0"/>`;
    s += '<g clip-path="url(#pl-clip-sweep)">';
    s += '<line class="stop-ghost" id="pl-stop-trap"/><line class="stop-line" id="pl-stop"/>';
    ['v', 'a', 'j', 'q'].forEach((k, i) => {
      if (k !== 'j') s += `<path class="${k === 'q' ? 'tr-ghost' : 'tr-plan-ghost'}" id="pl-trap-${k}" clip-path="url(#pl-clip-${i})" d=""/>`;
      s += `<path class="${k === 'q' ? 'tr-pos' : 'tr-plan'}" id="pl-tr-${k}" clip-path="url(#pl-clip-${i})" d=""/>`;
    });
    s += '</g>';
    for (const [st, k, str] of names) {
      s += `<text class="ax ax-name" id="pl-name-${k}" data-top="${st.top}" x="${x1 - 6}" y="${st.top + 13}" text-anchor="end">${str}</text>`;
    }
    svg.innerHTML = s;
    right = x1;
  }

  /** Size each name's tab to its text, which depends on the words and the font. */
  function fitTabs(): void {
    svg.querySelectorAll<SVGTextElement>('.ax-name').forEach((label) => {
      const tab = svg.querySelector(`#${label.id}-tab`);
      if (!tab) return;
      const b = label.getBBox();
      // inside the strip's frame: half a pixel clear of its top and right edges
      const top = Number(label.dataset['top']) + 0.5;
      const y = Math.max(top, b.y - 1);
      tab.setAttribute('x', one(b.x - 4));
      tab.setAttribute('y', one(y));
      tab.setAttribute('width', one(Math.max(0, right - 0.5 - (b.x - 4))));
      tab.setAttribute('height', one(b.y + b.height + 1 - y));
    });
  }

  const set = (id: string, attr: string, value: string) => svg.querySelector(`#${id}`)?.setAttribute(attr, value);

  /** Path through f(t) for t in [from, to], about 1.5 points per pixel. */
  function path(f: (t: number) => number, strip: Strip, from = 0, to: number = MOVE.window, clamp = Infinity): string {
    const n = Math.max(2, Math.round(pw * 1.5 * ((to - from) / MOVE.window)));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = from + ((to - from) * i) / n;
      const v = Math.max(-clamp, Math.min(clamp, f(t)));
      d += `${i ? 'L' : 'M'}${one(X(t))},${one(strip.y(v))}`;
    }
    return d;
  }

  /** The swing, in mm, sampled every millisecond: drawn only once the axis has stopped. */
  function swingPath(q: Float32Array, dt: number, stop: number, strip: Strip): string {
    const clamp = SWING_MM * 1.2;
    return path((t) => (q[Math.min(q.length - 1, Math.round(t / dt))] ?? 0) * 1000, strip, stop, MOVE.window, clamp);
  }

  function paint(): void {
    if (!current || strips.length < 4) return;
    const [sv, sa, sj, sq] = strips as [Strip, Strip, Strip, Strip];
    const p = current.plan;
    set('pl-tr-v', 'd', path((t) => sampleAt(p, t).v, sv));
    set('pl-tr-a', 'd', path((t) => sampleAt(p, t).a, sa));
    // jerk is always full or none, so draw its sign against the ±jmax lines
    set('pl-tr-j', 'd', path((t) => Math.sign(sampleAt(p, t).j), sj));
    set('pl-tr-q', 'd', swingPath(current.flex.q, current.flex.dt, p.duration, sq));
    // Like a scope, the strip has a fixed range; say so when the swing leaves it.
    const { q, dt } = current.flex;
    let peak = 0;
    for (let i = Math.ceil(p.duration / dt); i < q.length; i++) peak = Math.max(peak, Math.abs(q[i] ?? 0));
    const over = peak * 1000 > SWING_MM;
    const qName = svg.querySelector('#pl-name-q');
    if (qName) {
      qName.textContent = over ? 'payload swing, mm, off scale' : 'payload swing, mm';
      qName.classList.toggle('over', over);
    }
    fitTabs();

    const ya = one(sa.y(lim.a));
    const yan = one(sa.y(-lim.a));
    set('pl-alim-p', 'y1', ya);
    set('pl-alim-p', 'y2', ya);
    set('pl-alim-n', 'y1', yan);
    set('pl-alim-n', 'y2', yan);
    set('pl-alim-t', 'y', one(sa.y(lim.a) + 3.5));
    const alimText = svg.querySelector('#pl-alim-t');
    if (alimText) alimText.textContent = lim.a.toFixed(1);
    // a small amax brings its label down onto the zero label; the zero gives way
    set('pl-a0-t', 'visibility', sa.y(0) - sa.y(lim.a) < 11 ? 'hidden' : 'visible');
    const jlimText = svg.querySelector('#pl-jlim-t');
    if (jlimText) jlimText.textContent = formatJerk(lim.j);

    const xs = one(X(p.duration));
    set('pl-stop', 'x1', xs);
    set('pl-stop', 'x2', xs);
    set('pl-stop', 'y1', String(sv.top));
    set('pl-stop', 'y2', String(sq.bottom));

    const showTrap = trapBox.checked;
    trapLegend.hidden = !showTrap;
    const trap = trapFor(lim.a);
    set('pl-trap-v', 'd', showTrap ? path(trap.v, sv) : '');
    set('pl-trap-a', 'd', showTrap ? path(trap.a, sa) : '');
    set('pl-trap-q', 'd', showTrap ? swingPath(trap.swing, 0.001, trap.duration, sq) : '');
    const xt = one(X(trap.duration));
    set('pl-stop-trap', 'x1', xt);
    set('pl-stop-trap', 'x2', xt);
    set('pl-stop-trap', 'y1', showTrap ? String(sv.top) : '0');
    set('pl-stop-trap', 'y2', showTrap ? String(sq.bottom) : '0');
  }

  function setCell(el: HTMLElement, text: string, pass: boolean | null): void {
    if (pass !== null) {
      el.classList.toggle('pass', pass);
      el.classList.toggle('fail', !pass);
      const word = el.querySelector('.st-word');
      if (word) word.textContent = pass ? 'Pass' : 'Fail';
    }
    const num = el.querySelector('.num');
    if (num) num.textContent = text;
  }

  function update(): void {
    const a = Number(aInput.value);
    const j = jerkAt(Number(jInput.value));
    lim = { v: MOVE.vMax, a, j };
    current = evaluate(lim);
    const { plan: p, residualMm, verdict } = current;

    aOut.textContent = a.toFixed(1);
    jOut.textContent = formatJerk(j);
    jInput.setAttribute('aria-valuetext', `${formatJerk(j)} meters per second cubed`);
    aCode.textContent = `${a.toFixed(2)}f`;
    jCode.textContent = `${formatJerk(j, 4)}f`;
    for (const [el, min, max, v] of [
      [aInput, ACCEL_RANGE.min, ACCEL_RANGE.max, a],
      [jInput, JERK_SLIDER.min, JERK_SLIDER.max, Number(jInput.value)],
    ] as const) {
      el.style.setProperty('--pct', `${(((v - min) / (max - min)) * 100).toFixed(2)}%`);
    }

    setCell(cells.time, `${p.duration.toFixed(2)}${NB}s`, verdict.time);
    setCell(cells.res, residualMm >= 99.5 ? `>99${NB}mm` : `${residualMm.toFixed(2)}${NB}mm`, verdict.vibration);
    setCell(cells.ramp, `${Math.round(p.ramp * 1000)}${NB}ms`, null);
    advice.textContent = current.advice;
    advice.classList.toggle('ok', verdict.all);
    paint();
  }

  const announce = () => {
    if (!current) return;
    const { plan: p, residualMm, verdict } = current;
    status.textContent =
      `Move time ${p.duration.toFixed(2)} seconds, ${verdict.time ? 'pass' : 'fail'}. ` +
      `Residual vibration ${residualMm.toFixed(2)} millimeters, ${verdict.vibration ? 'pass' : 'fail'}. ` +
      `Jerk ramps ${Math.round(p.ramp * 1000)} milliseconds. ${current.advice}`;
  };

  for (const input of [aInput, jInput]) {
    input.addEventListener('input', update);
    input.addEventListener('change', announce);
  }
  trapBox.addEventListener('change', () => {
    paint();
    announce();
  });
  resetBtn.addEventListener('click', () => {
    aInput.value = String(DEFAULT_LIMITS.a);
    jInput.value = String(jerkStep(DEFAULT_LIMITS.j));
    update();
    announce();
  });

  build();
  update();
  // the names may have been measured in a fallback font
  void document.fonts.ready.then(fitTabs);

  // One sweep on arrival, the way a scope draws a trace.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = plot.getBoundingClientRect();
  if (!reduce && box.top < window.innerHeight && box.bottom > 0) {
    const rect = svg.querySelector('#pl-sweep');
    const duration = 1200;
    let t0: number | null = null;
    const frame = (now: number) => {
      t0 ??= now;
      const f = Math.min(1, (now - t0) / duration);
      rect?.setAttribute('width', ((pw + 6) * f).toFixed(1));
      if (f < 1) requestAnimationFrame(frame);
    };
    rect?.setAttribute('width', '0');
    requestAnimationFrame(frame);
  }

  let lastW = plot.clientWidth;
  new ResizeObserver(() => {
    const w = plot.clientWidth;
    if (Math.abs(w - lastW) < 1) return;
    lastW = w;
    build();
    paint();
  }).observe(plot);
}
