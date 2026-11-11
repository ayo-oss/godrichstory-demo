import { useEffect, useRef } from "react";
import styles from "./ShcastPointLightPlanarProjection.module.scss";

const W = 480;
const H = 300;
const PI2 = Math.PI * 2;
const FIXED_DT = 16;
const REDUCE_STEP_MS = 900;
const REDUCE_START_MS = 1000;
const PERIOD_MS = 4000;
const KEY_STEP = 12;
const FONT = '-apple-system, "Segoe UI", "Noto Sans KR", sans-serif';

type Pt = [number, number];
interface Scene {
  path(t: number): Pt;
  pos(): Pt;
  update(tx: number, ty: number): void;
  snap(tx: number, ty: number): void;
  draw(t: number): void;
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
function rgba(c: number[], a: number): string {
  return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a.toFixed(3) + ')';
}
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
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: number[], a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(c, a));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function polyPath(ctx: CanvasRenderingContext2D, poly: Pt[]): void {
  ctx.beginPath();
  for (let i = 0; i < poly.length; i += 1) {
    if (i === 0) { ctx.moveTo(poly[i][0], poly[i][1]); } else { ctx.lineTo(poly[i][0], poly[i][1]); }
  }
  ctx.closePath();
}

// 광원 (lx, ly, lh) 에서 점 (x, y, h) 를 바닥 높이 0 으로 내리는 투영 — 닮음비 lh / (lh - h)
function castPoint(lx: number, ly: number, lh: number, x: number, y: number, h: number): Pt {
  const k = lh / Math.max(lh - h, 8);
  return [lx + (x - lx) * k, ly + (y - ly) * k];
}
// 볼록 껍질 (단조 체인) — 바닥 꼭짓점과 투영된 윗 꼭짓점을 한 덩어리 그림자로 묶는다
function hull(src: Pt[]): Pt[] {
  const p = src.slice().sort(function (a: Pt, b: Pt): number { return a[0] - b[0] || a[1] - b[1]; });
  function cross(o: Pt, a: Pt, b: Pt): number { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  const lo: Pt[] = [];
  for (let i = 0; i < p.length; i += 1) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) { lo.pop(); }
    lo.push(p[i]);
  }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i -= 1) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) { up.pop(); }
    up.push(p[i]);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}
// 직육면체 한 개의 그림자 다각형 — 바닥 네 꼭짓점과 높이 h 위 네 꼭짓점을 광원에서 투영한다
function boxShadow(lx: number, ly: number, lh: number, x0: number, y0: number, x1: number, y1: number, h: number): Pt[] {
  const base: Pt[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const pts: Pt[] = base.slice();
  for (let i = 0; i < base.length; i += 1) { pts.push(castPoint(lx, ly, lh, base[i][0], base[i][1], h)); }
  return hull(pts);
}
function fillShadow(ctx: CanvasRenderingContext2D, poly: Pt[], ink: number[], alpha: number): void {
  polyPath(ctx, poly);
  ctx.fillStyle = rgba(ink, alpha);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = rgba(ink, alpha * 0.32);
  ctx.stroke();
}
// 비스듬히 본 직육면체 — 윗면은 높이의 0.6 만큼 위로 밀고 앞면을 아래에 붙인다
function drawBlock(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, h: number, top: number[], front: number[]): void {
  const vis = h * 0.6;
  ctx.fillStyle = rgba(front, 1);
  ctx.fillRect(x0, y1 - vis, x1 - x0, vis);
  ctx.fillStyle = rgba(top, 1);
  ctx.fillRect(x0, y0 - vis, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x0, y0 - vis, x1 - x0, 2);
}

const LIGHT_HEIGHT = 220;
const ORBIT_RADIUS = 110;
const LIGHT_LERP = 0.2;
const BOX_HEIGHT = 70;
const BOX_RECT = [212, 140, 268, 178];
const CENTER_X = 240;
const CENTER_Y = 150;
const FLOOR_RGB = [243, 238, 250];
const SHADOW_RGB = [74, 56, 120];
const WARM_RGB = [255, 226, 150];
const LILAC_TOP = [196, 172, 255];
const LILAC_FRONT = [150, 120, 232];

function makeScene(ctx: CanvasRenderingContext2D): Scene {
  let lx = CENTER_X + ORBIT_RADIUS;
  let ly = CENTER_Y;
  const scene: Scene = {
    path: function (t: number): Pt {
      const a = PI2 * t / PERIOD_MS;
      return [CENTER_X + ORBIT_RADIUS * Math.cos(a), CENTER_Y + ORBIT_RADIUS * 0.72 * Math.sin(a)];
    },
    pos: function (): Pt { return [lx, ly]; },
    update: function (tx: number, ty: number): void {
      lx = lerp(lx, tx, LIGHT_LERP);
      ly = lerp(ly, ty, LIGHT_LERP);
    },
    snap: function (tx: number, ty: number): void { lx = tx; ly = ty; },
    draw: function (): void {
      ctx.fillStyle = rgba(FLOOR_RGB, 1);
      ctx.fillRect(0, 0, W, H);
      glow(ctx, lx, ly, 300, WARM_RGB, 0.95);
      const poly = boxShadow(lx, ly, LIGHT_HEIGHT, BOX_RECT[0], BOX_RECT[1], BOX_RECT[2], BOX_RECT[3], BOX_HEIGHT);
      fillShadow(ctx, poly, SHADOW_RGB, 0.46);
      drawBlock(ctx, BOX_RECT[0], BOX_RECT[1], BOX_RECT[2], BOX_RECT[3], BOX_HEIGHT, LILAC_TOP, LILAC_FRONT);
      glow(ctx, lx, ly, 26, [255, 255, 255], 0.9);
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, PI2);
      ctx.fillStyle = 'rgba(255,248,214,1)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(214,170,70,0.9)';
      ctx.stroke();
    }
  };
  return scene;
}

function main(rootEl: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLButtonElement): () => void {
  const ctx0 = canvas.getContext('2d');
  if (!ctx0) { return function (): void { return; }; }
  canvas.width = W;
  canvas.height = H;
  const scene: Scene = makeScene(ctx0);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { rootEl.classList.remove('is-demo'); }
  let paused = false;
  let autoplay = !reduce;
  let elapsed = reduce ? REDUCE_START_MS : 0;
  let rafId = 0;
  let lastTs: number | null = null;
  let accMs = 0;
  let tgt: Pt = scene.path(elapsed);
  const cleaners: Array<() => void> = [];

  function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
    target.addEventListener(type, fn);
    cleaners.push(function (): void { target.removeEventListener(type, fn); });
  }
  function setMode(): void {
    if (reduce) {
      statusEl.textContent = '한 장면씩 넘기는 중';
      btnEl.textContent = '다음 장면';
      return;
    }
    statusEl.textContent = !autoplay ? '직접 조작 중' : (paused ? '일시정지됨' : '시연 중');
    btnEl.textContent = (autoplay && !paused) ? '멈춤' : '재생';
  }
  function toLocal(e: PointerEvent): Pt {
    const r = canvas.getBoundingClientRect();
    return [clamp((e.clientX - r.left) * W / r.width, 0, W), clamp((e.clientY - r.top) * H / r.height, 0, H)];
  }
  function takeOver(): void {
    if (reduce || !autoplay) { return; }
    autoplay = false;
    paused = false;
    rootEl.classList.remove('is-demo');
    const p = scene.pos();
    tgt = [p[0], p[1]];
    setMode();
  }
  function afterInput(): void {
    if (reduce) {
      scene.snap(tgt[0], tgt[1]);
      scene.draw(elapsed);
    }
  }
  function onButton(): void {
    if (reduce) {
      elapsed += REDUCE_STEP_MS;
      tgt = scene.path(elapsed);
      scene.snap(tgt[0], tgt[1]);
      scene.draw(elapsed);
      return;
    }
    if (autoplay && !paused) {
      paused = true;
    } else {
      paused = false;
      autoplay = true;
      rootEl.classList.add('is-demo');
    }
    setMode();
  }
  function tick(ts: number): void {
    if (lastTs === null) { lastTs = ts; }
    const frameDt = Math.min(ts - lastTs, 160);
    lastTs = ts;
    if (!paused) {
      accMs += frameDt;
      while (accMs >= FIXED_DT) {
        elapsed += FIXED_DT;
        accMs -= FIXED_DT;
        if (autoplay) { tgt = scene.path(elapsed); }
        scene.update(tgt[0], tgt[1]);
      }
      scene.draw(elapsed);
    }
    rafId = requestAnimationFrame(tick);
  }
  listen(btnEl, 'click', function (): void { onButton(); });
  listen(canvas, 'pointerdown', function (e: Event): void {
    takeOver();
    tgt = toLocal(e as PointerEvent);
    afterInput();
  });
  listen(canvas, 'pointermove', function (e: Event): void {
    if (autoplay && !reduce) { return; }
    tgt = toLocal(e as PointerEvent);
    afterInput();
  });
  listen(canvas, 'keydown', function (e: Event): void {
    const k = (e as KeyboardEvent).key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      onButton();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (k === 'ArrowLeft') { dx = -KEY_STEP; } else if (k === 'ArrowRight') { dx = KEY_STEP; }
    else if (k === 'ArrowUp') { dy = -KEY_STEP; } else if (k === 'ArrowDown') { dy = KEY_STEP; }
    else { return; }
    e.preventDefault();
    takeOver();
    tgt = [clamp(tgt[0] + dx, 0, W), clamp(tgt[1] + dy, 0, H)];
    afterInput();
  });
  if (reduce) {
    scene.snap(tgt[0], tgt[1]);
    scene.draw(elapsed);
    setMode();
  } else {
    scene.draw(elapsed);
    setMode();
    rafId = requestAnimationFrame(tick);
  }
  function destroy(): void {
    cancelAnimationFrame(rafId);
    for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
  }
  return destroy;
}

export default function ShcastPointLightPlanarProjection() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="광원의 위치와 물체 높이로 꼭짓점마다 바닥 좌표를 계산해, 광원이 돌면 그림자가 반대쪽으로 돌아간다." />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>광원의 위치와 물체 높이로 꼭짓점마다 바닥 좌표를 계산해, 광원이 돌면 그림자가 반대쪽으로 돌아간다.</p>
      </div>
    </main>
  );
}
