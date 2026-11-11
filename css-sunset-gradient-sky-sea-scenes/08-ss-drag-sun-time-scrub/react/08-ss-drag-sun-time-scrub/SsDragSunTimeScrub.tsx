import { useEffect, useRef } from "react";
import styles from "./SsDragSunTimeScrub.module.scss";

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

const CLOUD_LAYERS = 4;
const UNDERLIT_BIAS = 0.7;
const LIGHT_REACH = 0.9;
// 구름 한 층(0 = 맨 위, 1 = 맨 아래)이 해 불빛을 받는 정도 — 해가 낮을수록 빛이 닿는 깊이가 위로 올라온다
function underlit(layerK: number, alt: number): number {
  const reach = (1 - smooth(alt / 0.55)) * LIGHT_REACH;
  const u = Math.pow(1 - layerK, 1 + UNDERLIT_BIAS);
  return smooth((reach - u) / 0.4);
}
function cloudTone(layerK: number, alt: number): RGB {
  const dusk = 1 - smooth((alt + 0.1) / 0.5);
  const body = mix([246, 246, 253], [124, 120, 172], dusk);
  const shaded = mix(body, [body[0] * 0.9, body[1] * 0.9, body[2] * 0.96], layerK * 0.4);
  const flame = mix([255, 204, 156], [255, 132, 128], layerK);
  return mix(shaded, flame, underlit(layerK, alt));
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

const ARC_RADIUS = 176;
const ARC_CX = 240;
const ARC_CY = 204;
const DRAG_SMOOTH = 0.22;
const DAY_CLAMP = 0.015;
const SCRUB_STEP = 0.04;
const AUTO_MS = 7600;
const SUN_PX = 15;
const SCRUB_STARS = 64;
const REST_S = 0.8;
interface Star { x: number; y: number; b: number; thr: number; }
function makeStars(): Star[] {
  const rnd = mulberry32(808);
  const out: Star[] = [];
  for (let i = 0; i < SCRUB_STARS; i += 1) {
    const b = Math.pow(rnd(), 2.2);
    out.push({ x: 8 + rnd() * (W - 16), y: 6 + rnd() * (HORIZON - 40), b: b, thr: lerp(0.2, 0.62, b) });
  }
  return out;
}
const stars: Star[] = makeStars();
// 호 위의 위치 s(0 = 왼쪽 끝, 1 = 오른쪽 끝) -> 해의 화면 좌표와 높이
function arcPoint(s: number): { x: number; y: number; alt: number } {
  const x = ARC_CX - ARC_RADIUS * Math.cos(Math.PI * s);
  const y = ARC_CY - ARC_RADIUS * Math.sin(Math.PI * s);
  return { x: x, y: y, alt: (HORIZON - y) / SUN_RISE };
}
// 포인터 위치 -> 호 위 s. 호 아래로 내려가면 가까운 끝으로 붙는다
function sFromPointer(px: number, py: number): number {
  const ang = Math.atan2(ARC_CY - py, px - ARC_CX);
  if (ang < 0) { return px < ARC_CX ? DAY_CLAMP : 1 - DAY_CLAMP; }
  return clamp(1 - ang / Math.PI, DAY_CLAMP, 1 - DAY_CLAMP);
}
function clockText(s: number): string {
  const mins = Math.round((6 + 12 * s) * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return 'h ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}
function drawScene(ctx: Ctx, s: number, t: number): number {
  const p = arcPoint(s);
  const alt = p.alt;
  skyRows(ctx, alt, 0, HORIZON, 2);
  for (let i = 0; i < stars.length; i += 1) {
    const st = stars[i];
    const vis = smooth((st.thr - luma(skyAt(alt, st.y / HORIZON))) / 0.07);
    if (vis > 0.02) {
      ctx.fillStyle = 'rgba(255,252,240,' + (vis * (0.78 + 0.22 * Math.sin(t * 0.004 + st.x))).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, 0.7 + 1.4 * st.b, 0, PI2);
      ctx.fill();
    }
  }
  const sc = ramp(SUN_RAMP, alt);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, HORIZON);
  ctx.clip();
  glow(ctx, p.x, HORIZON, 150, sc, 0.4 * smooth((alt + 0.18) / 0.3) * (1 - smooth(alt / 0.5)));
  sunDisc(ctx, p.x, p.y, SUN_PX, SUN_PX, sc, 84);
  ctx.restore();
  // 구름 두 띠 — 한 값(alt)으로 윗면은 하늘 색에 남고 아랫면부터 불빛이 번진다
  for (let b = 0; b < 2; b += 1) {
    const cy = 62 + b * 40;
    const g = ctx.createLinearGradient(0, cy - 14, 0, cy + 14);
    g.addColorStop(0, css(cloudTone(0.05, alt), 0.95));
    g.addColorStop(0.5, css(cloudTone(0.5, alt), 0.95));
    g.addColorStop(1, css(cloudTone(1, alt), 0.95));
    ctx.fillStyle = g;
    const rnd = mulberry32(31 + b);
    for (let k = 0; k < 7; k += 1) {
      const cx = ((rnd() * W + t * (0.006 + 0.004 * b)) % (W + 120)) - 60;
      ctx.beginPath();
      ctx.ellipse(cx, cy + (rnd() - 0.5) * 8, 30 + rnd() * 22, 8 + rnd() * 6, 0, 0, PI2);
      ctx.fill();
    }
  }
  seaBase(ctx, alt, t);
  glitterRoad(ctx, alt, p.x, t, sc);
  // 해가 지나는 호와 손잡이
  for (let a = 0; a <= 1.001; a += 0.025) {
    const q = arcPoint(a);
    if (q.y < H - 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(q.x - 1, q.y - 1, 2, 2);
    }
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, SUN_PX + 6, 0, PI2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '600 11px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(W - 66, 8, 58, 17);
  ctx.fillStyle = 'rgba(40,36,64,0.85)';
  ctx.fillText(clockText(s), W - 14, 20);
  return alt;
}
function main(rootEl: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLElement): () => void {
  const ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  const ctx: Ctx = ctx0;
  canvas.width = W;
  canvas.height = H;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { rootEl.classList.remove('is-demo'); }
  const presets = [0.2, 0.5, 0.8, 0.97];
  let t = 0;
  let last: number | null = null;
  let paused = false;
  let manual = false;
  let target = reduce ? REST_S : 1 - DAY_CLAMP;
  let shownS = target;
  let preset = 2;
  let raf = 0;
  let pressed = false;
  let lastLabel = '';
  const cleaners: Array<() => void> = [];
  function listen(el: HTMLElement, type: string, fn: (e: Event) => void): void {
    el.addEventListener(type, fn);
    cleaners.push(function (): void { el.removeEventListener(type, fn); });
  }
  function show(): void {
    const a = drawScene(ctx, shownS, t);
    const s = labelOf(a);
    if (s !== lastLabel) { lastLabel = s; statusEl.textContent = s; }
  }
  function setButton(): void { btnEl.textContent = reduce ? '다음 장면' : (paused || manual ? '재생' : '멈춤'); }
  // 사용자가 끌거나 키를 누르면 자동 시연을 멈추고 그 값으로 간다 (움직임 줄이기에서도 입력은 즉시 반영)
  function takeOver(s: number): void {
    target = clamp(s, DAY_CLAMP, 1 - DAY_CLAMP);
    manual = true;
    if (reduce) { shownS = target; } else { paused = false; rootEl.classList.remove('is-demo'); setButton(); }
    show();
  }
  function onButton(): void {
    if (reduce) {
      preset = (preset + 1) % presets.length;
      target = presets[preset];
      shownS = target;
      show();
      return;
    }
    if (manual) {
      manual = false;
      t = 0;
      rootEl.classList.add('is-demo');
      paused = false;
    } else {
      paused = !paused;
      if (paused) { rootEl.classList.remove('is-demo'); } else { rootEl.classList.add('is-demo'); }
    }
    setButton();
  }
  function toS(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    return sFromPointer((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  }
  function tick(ts: number): void {
    if (last === null) { last = ts; }
    const dt = Math.min(ts - last, 160);
    last = ts;
    if (!paused) {
      if (!manual) {
        t += dt;
        target = 0.5 + (0.5 - DAY_CLAMP) * Math.cos(PI2 * t / AUTO_MS);
      }
      shownS += (target - shownS) * (1 - Math.pow(1 - DRAG_SMOOTH, dt / 16.7));
      show();
    }
    raf = requestAnimationFrame(tick);
  }
  listen(btnEl, 'click', function (): void { onButton(); });
  listen(canvas, 'pointerdown', function (e: Event): void { pressed = true; takeOver(toS(e as PointerEvent)); });
  listen(canvas, 'pointermove', function (e: Event): void { if (pressed) { takeOver(toS(e as PointerEvent)); } });
  listen(canvas, 'pointerup', function (): void { pressed = false; });
  listen(canvas, 'pointercancel', function (): void { pressed = false; });
  listen(canvas, 'keydown', function (e: Event): void {
    const k = (e as KeyboardEvent).key;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); onButton(); return; }
    let d = 0;
    if (k === 'ArrowRight' || k === 'ArrowUp') { d = SCRUB_STEP; }
    else if (k === 'ArrowLeft' || k === 'ArrowDown') { d = -SCRUB_STEP; }
    else { return; }
    e.preventDefault();
    takeOver(target + d);
  });
  setButton();
  show();
  if (!reduce) { raf = requestAnimationFrame(tick); }
  return function (): void {
    cancelAnimationFrame(raf);
    for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  };
}

export default function SsDragSunTimeScrub() {
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
    return main(root, canvas, statusEl, btnEl);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sc} is-demo`} ref={rootRef}>
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="해를 끌어 하루를 되감는 노을 시간 스크러버" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">해가 졌다 — 땅거미</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
      </div>
    </main>
  );
}
