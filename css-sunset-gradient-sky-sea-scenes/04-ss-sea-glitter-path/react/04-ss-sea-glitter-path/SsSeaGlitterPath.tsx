import { useEffect, useRef } from "react";
import styles from "./SsSeaGlitterPath.module.scss";

type RGB = [number, number, number];
type Stop = [number, RGB];
type Ctx = CanvasRenderingContext2D;
const W = 480;
const H = 300;
const PI2 = Math.PI * 2;
const HORIZON = 186;
const SUN_RISE = 150;
const SUN_X = 312;
const SUN_ALT = 0.5;
const ALT_NIGHT = -0.15;
const PERIOD_MS = 4400;
const KEY_ALT = 0.05;
const SKY_BLEND = 1.7;
// 해 높이(0 = 지평선, 1 = 높이 뜸) 순서대로 고른 색 띠 — 정점 쪽, 지평선 쪽, 해 원반
const ZENITH_RAMP: Stop[] = [[-0.15, [40, 44, 96]], [0, [92, 92, 156]], [0.12, [128, 126, 182]], [0.3, [150, 160, 214]], [0.6, [150, 192, 238]], [1, [138, 190, 242]]];
const HORIZON_RAMP: Stop[] = [[-0.15, [110, 104, 160]], [0, [238, 134, 142]], [0.12, [255, 168, 146]], [0.3, [255, 208, 166]], [0.6, [240, 226, 222]], [1, [206, 230, 248]]];
const SUN_RAMP: Stop[] = [[-0.15, [238, 128, 134]], [0, [255, 150, 126]], [0.15, [255, 190, 140]], [0.4, [255, 226, 176]], [1, [255, 246, 222]]];
const TXT_HIGH = '해가 높다 — 낮 하늘';
const TXT_GOLD = '해가 기운다 — 금빛 오후';
const TXT_GLOW = '해가 낮다 — 노을';
const TXT_TOUCH = '해가 지평선에 닿는다 — 붉은 띠';
const TXT_DUSK = '해가 졌다 — 땅거미';
function labelOf(alt: number): string {
  if (alt > 0.6) { return TXT_HIGH; }
  if (alt > 0.3) { return TXT_GOLD; }
  if (alt > 0.08) { return TXT_GLOW; }
  if (alt > -0.06) { return TXT_TOUCH; }
  return TXT_DUSK;
}
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function css(c: RGB, a: number): string {
  return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a.toFixed(3) + ')';
}
function luma(c: RGB): number { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
// 시드 고정 난수 — 같은 시드면 언제나 같은 수열
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), fx), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), fx), fy);
}
function fbm(x: number, y: number): number {
  return vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 7.3, y * 2.1 + 3.1) * 0.3 + vnoise(x * 4.3 + 1.7, y * 4.3 + 9.4) * 0.15;
}
function ramp(stops: Stop[], a: number): RGB {
  if (a <= stops[0][0]) { return stops[0][1]; }
  for (let i = 1; i < stops.length; i += 1) {
    if (a <= stops[i][0]) {
      const p = stops[i - 1];
      const q = stops[i];
      return mix(p[1], q[1], (a - p[0]) / (q[0] - p[0]));
    }
  }
  return stops[stops.length - 1][1];
}
// 하늘 한 점의 색 — v 는 0(정점)에서 1(지평선)
function skyAt(alt: number, v: number): RGB {
  return mix(ramp(ZENITH_RAMP, alt), ramp(HORIZON_RAMP, alt), Math.pow(clamp(v, 0, 1), SKY_BLEND));
}
function sunY(alt: number): number { return HORIZON - alt * SUN_RISE; }
function seaDeep(alt: number): RGB { return mix([84, 128, 170], [36, 48, 98], clamp((0.3 - alt) / 0.4, 0, 1)); }
function glow(ctx: Ctx, x: number, y: number, r: number, c: RGB, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(c, a));
  g.addColorStop(1, css(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function skyRows(ctx: Ctx, alt: number, y0: number, y1: number, step: number): void {
  for (let y = y0; y < y1; y += step) {
    ctx.fillStyle = css(skyAt(alt, (y - y0) / (y1 - y0)), 1);
    ctx.fillRect(0, y, W, step + 1);
  }
}
// 바다 바탕 — 지평선 하늘색을 받아 아래로 갈수록 깊어지고, 줄마다 잔물결 밝기가 흔들린다
function seaBase(ctx: Ctx, alt: number, t: number): void {
  const top = mix(skyAt(alt, 1), seaDeep(alt), 0.35);
  const deep = seaDeep(alt);
  for (let y = HORIZON; y < H; y += 3) {
    const k = (y - HORIZON) / (H - HORIZON);
    const c = mix(top, deep, Math.pow(k, 0.7));
    const r = 1 + 0.05 * Math.sin(y * 0.8 + t * 0.0018 + k * 6);
    ctx.fillStyle = css([c[0] * r, c[1] * r, c[2] * r], 1);
    ctx.fillRect(0, y, W, 4);
  }
}
function sunDisc(ctx: Ctx, x: number, y: number, rx: number, ry: number, c: RGB, halo: number): void {
  glow(ctx, x, y, halo, c, 0.5);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, PI2);
  ctx.fillStyle = css(c, 1);
  ctx.fill();
}
// 오른쪽 가장자리의 해 높이 눈금 — 입력이 얼마인지 눈에 보이게
function gauge(ctx: Ctx, alt: number, lo: number, hi: number): void {
  const y0 = 46;
  const y1 = 236;
  const gy = lerp(y1, y0, (alt - lo) / (hi - lo));
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(W - 14, y0, 2, y1 - y0);
  ctx.beginPath();
  ctx.arc(W - 13, clamp(gy, y0, y1), 5, 0, PI2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(W - 76, 8, 68, 17);
  ctx.fillStyle = 'rgba(40,36,64,0.85)';
  ctx.fillText('alt ' + alt.toFixed(2), W - 14, 20);
}

const WAVE_AMP = 14;
const GLITTER_WIDTH = 22;
const ROW_JITTER = 0.7;
// 바다 윤슬 길 — 수면 가로줄마다 파도로 흔들린 위치를 구하고, 해 아래 폭 안의 조각만 밝게 칠한다
function glitterRoad(ctx: Ctx, alt: number, cx0: number, t: number, col: RGB): void {
  const vis = smooth((alt + 0.08) / 0.22);
  if (vis <= 0.01) { return; }
  const lit = mix(col, [255, 255, 255], 0.4);
  for (let y = HORIZON + 1; y < H; y += 2) {
    const d = (y - HORIZON) / (H - HORIZON);
    const jit = ROW_JITTER * (hash2(y, 11) - 0.5) * 2;
    const shift = WAVE_AMP * (0.18 + 0.82 * d) * (Math.sin(y * 0.31 + t * 0.0021) + 0.6 * Math.sin(y * 0.77 - t * 0.0033 + jit * 3) + jit * 0.5);
    const half = GLITTER_WIDTH * (0.35 + 1.1 * d);
    const seg = 9;
    const segW = half * 2 / seg;
    for (let s = 0; s < seg; s += 1) {
      const u = (s + 0.5) / seg * 2 - 1;
      const on = smooth((vnoise(s * 1.7 + y * 0.11, t * 0.0016 + y * 0.05) - 0.42) * 5);
      const a = vis * (1 - u * u) * on * (0.95 - 0.4 * d);
      if (a > 0.02) {
        ctx.fillStyle = css(lit, a);
        ctx.fillRect(cx0 + shift - half + s * segW, y, segW * 0.9, 2);
      }
    }
  }
}

interface Scene {
  from: number;
  to: number;
  hi: number;
  lo: number;
  draw(ctx: Ctx, alt: number, t: number): void;
}
function main(rootEl: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLElement, scene: Scene): () => void {
  const ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  const ctx: Ctx = ctx0;
  canvas.width = W;
  canvas.height = H;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { rootEl.classList.remove('is-demo'); }
  const lo = Math.min(scene.lo, scene.hi);
  const hi = Math.max(scene.lo, scene.hi);
  let t = 0;
  let last: number | null = null;
  let paused = false;
  let manual: number | null = null;
  let preset = 0;
  let raf = 0;
  let pressed = false;
  let lastLabel = '';
  const cleaners: Array<() => void> = [];
  function listen(target: HTMLElement, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    cleaners.push(function (): void { target.removeEventListener(type, fn); });
  }
  function currentAlt(): number {
    if (manual !== null) { return manual; }
    if (reduce) { return scene.from; }
    return lerp(scene.from, scene.to, 0.5 - 0.5 * Math.cos(PI2 * t / PERIOD_MS));
  }
  function show(): void {
    const a = currentAlt();
    scene.draw(ctx, a, t);
    gauge(ctx, a, lo, hi);
    const s = labelOf(a);
    if (s !== lastLabel) { lastLabel = s; statusEl.textContent = s; }
  }
  function setButton(): void {
    btnEl.textContent = reduce ? '다음 장면' : (paused ? '재생' : '멈춤');
  }
  function takeOver(a: number): void {
    manual = clamp(a, lo, hi);
    if (!reduce) { paused = true; rootEl.classList.remove('is-demo'); setButton(); }
    show();
  }
  function onButton(): void {
    if (reduce) {
      preset = (preset + 1) % 4;
      manual = lerp(scene.from, scene.to, preset / 3);
      show();
      return;
    }
    paused = !paused;
    if (paused) { rootEl.classList.remove('is-demo'); }
    else { rootEl.classList.add('is-demo'); manual = null; }
    setButton();
  }
  function altAtY(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    const py = clamp((e.clientY - r.top) * H / r.height, 0, H);
    return lerp(hi, lo, py / H);
  }
  function tick(ts: number): void {
    if (last === null) { last = ts; }
    const dt = Math.min(ts - last, 160);
    last = ts;
    if (!paused) { t += dt; show(); }
    raf = requestAnimationFrame(tick);
  }
  listen(btnEl, 'click', function (): void { onButton(); });
  listen(canvas, 'pointerdown', function (e: Event): void { pressed = true; takeOver(altAtY(e as PointerEvent)); });
  listen(canvas, 'pointermove', function (e: Event): void { if (pressed) { takeOver(altAtY(e as PointerEvent)); } });
  listen(canvas, 'pointerup', function (): void { pressed = false; });
  listen(canvas, 'pointercancel', function (): void { pressed = false; });
  listen(canvas, 'keydown', function (e: Event): void {
    const k = (e as KeyboardEvent).key;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); onButton(); return; }
    let d = 0;
    if (k === 'ArrowUp' || k === 'ArrowRight') { d = KEY_ALT; }
    else if (k === 'ArrowDown' || k === 'ArrowLeft') { d = -KEY_ALT; }
    else { return; }
    e.preventDefault();
    takeOver(currentAlt() + d);
  });
  setButton();
  show();
  if (!reduce) { raf = requestAnimationFrame(tick); }
  return function (): void {
    cancelAnimationFrame(raf);
    for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  };
}

const scene: Scene = {
  from: 0.3,
  to: -0.1,
  hi: 0.8,
  lo: ALT_NIGHT,
  draw: function (ctx: Ctx, alt: number, t: number): void {
    skyRows(ctx, alt, 0, HORIZON, 2);
    const sc = ramp(SUN_RAMP, alt);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, HORIZON);
    ctx.clip();
    sunDisc(ctx, SUN_X, sunY(alt), 16, 16, sc, 90);
    ctx.restore();
    seaBase(ctx, alt, t);
    ctx.save();
    ctx.translate(SUN_X, HORIZON + 54);
    ctx.scale(0.6, 2.8);
    glow(ctx, 0, 0, 60, sc, 0.3 * smooth((alt + 0.1) / 0.3));
    ctx.restore();
    glitterRoad(ctx, alt, SUN_X, t, sc);
  }
};

export default function SsSeaGlitterPath() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const statusEl = statusRef.current;
    const btnEl = btnRef.current;
    if (!root || !canvas || !statusEl || !btnEl) return;
    return main(root, canvas, statusEl, btnEl, scene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sc} is-demo`} ref={rootRef}>
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="해 아래로 길게 이어지는 바다 윤슬 길" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">해가 낮다 — 노을</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
      </div>
    </main>
  );
}
