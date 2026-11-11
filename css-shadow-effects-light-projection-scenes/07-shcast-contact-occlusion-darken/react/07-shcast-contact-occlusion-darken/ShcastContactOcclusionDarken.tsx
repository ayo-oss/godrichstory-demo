import { useEffect, useRef } from "react";
import styles from "./ShcastContactOcclusionDarken.module.scss";

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

const AO_RADIUS = 26;
const AO_STRENGTH = 0.66;
const HEIGHT_MAX = 96;
const OBJECT_COUNT = 3;
const LIGHT_LERP = 0.16;
const GROUND_Y = 220;
const FLOOR_RGB = [243, 238, 250];
const INK_RGB = [66, 48, 112];
const OBJ_XS = [118, 240, 362];
const OBJ_HALF = [26, 24, 20];
const OBJ_REACH = [1, 0.72, 0.88];
const OBJ_FOLLOW = [0.12, 0.09, 0.07];
const OBJ_RGBS = [[255, 206, 190], [186, 222, 255], [200, 240, 214]];
const OBJ_EDGE = [[232, 150, 130], [120, 170, 232], [120, 208, 160]];

// 높이 h 의 물체 아래 접촉 그림자 — 가까울수록 작고 진하고, 멀수록 넓고 옅다
function contactAlpha(h: number): number {
  const near = 1 - clamp(h / HEIGHT_MAX, 0, 1);
  return AO_STRENGTH * near * near + 0.05;
}
function contactRadius(h: number, half: number): number {
  return (AO_RADIUS + half * 0.4) * (1 + 1.2 * clamp(h / HEIGHT_MAX, 0, 1));
}

function makeScene(ctx: CanvasRenderingContext2D): Scene {
  let lx = 240;
  let ly = 150;
  const level: number[] = [];
  for (let i = 0; i < OBJECT_COUNT; i += 1) { level.push(0.5); }
  function follow(k: number): void {
    const s = clamp((ly - 20) / 260, 0, 1);
    for (let i = 0; i < OBJECT_COUNT; i += 1) { level[i] = lerp(level[i], s, k * OBJ_FOLLOW[i] / 0.12); }
  }
  const scene: Scene = {
    path: function (t: number): Pt {
      const a = PI2 * t / PERIOD_MS;
      return [240 + 140 * Math.sin(a), 150 + 138 * Math.sin(a * 1.0 - 1.57)];
    },
    pos: function (): Pt { return [lx, ly]; },
    update: function (tx: number, ty: number): void {
      lx = lerp(lx, tx, LIGHT_LERP);
      ly = lerp(ly, ty, LIGHT_LERP);
      follow(0.16);
    },
    snap: function (tx: number, ty: number): void {
      lx = tx;
      ly = ty;
      for (let i = 0; i < OBJECT_COUNT; i += 1) { level[i] = clamp((ly - 20) / 260, 0, 1); }
    },
    draw: function (): void {
      ctx.fillStyle = rgba(FLOOR_RGB, 1);
      ctx.fillRect(0, 0, W, H);
      const wall = ctx.createLinearGradient(0, 0, 0, GROUND_Y - 30);
      wall.addColorStop(0, 'rgba(226,214,250,1)');
      wall.addColorStop(1, 'rgba(255,244,226,1)');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, GROUND_Y - 30);
      for (let i = 0; i < OBJECT_COUNT; i += 1) {
        const h = HEIGHT_MAX * level[i] * OBJ_REACH[i];
        const half = OBJ_HALF[i];
        const x = OBJ_XS[i];
        const rx = contactRadius(h, half);
        const a = contactAlpha(h);
        // 번진 바깥 층과 맞닿은 안쪽 핵 — 두 반지름이 높이에 따라 따로 변한다
        ctx.save();
        ctx.translate(x, GROUND_Y);
        ctx.scale(1, 0.3);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, rgba(INK_RGB, a));
        g.addColorStop(0.55, rgba(INK_RGB, a * 0.45));
        g.addColorStop(1, rgba(INK_RGB, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, PI2);
        ctx.fill();
        ctx.restore();
        const cy = GROUND_Y - h * 0.8 - half;
        if (i === 1) {
          ctx.fillStyle = rgba(OBJ_RGBS[i], 1);
          ctx.fillRect(x - half, cy - half, half * 2, half * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = rgba(OBJ_EDGE[i], 1);
          ctx.strokeRect(x - half, cy - half, half * 2, half * 2);
        } else {
          const sg = ctx.createRadialGradient(x - half * 0.35, cy - half * 0.4, half * 0.1, x, cy, half);
          sg.addColorStop(0, 'rgba(255,255,255,1)');
          sg.addColorStop(0.35, rgba(OBJ_RGBS[i], 1));
          sg.addColorStop(1, rgba(OBJ_EDGE[i], 1));
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(x, cy, half, 0, PI2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(INK_RGB, 0.7);
        ctx.font = '500 10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('h ' + String(Math.round(h)), x, GROUND_Y + 22);
      }
      glow(ctx, lx, 24, 30, [255, 226, 150], 0.9);
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

export default function ShcastContactOcclusionDarken() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="물체와 바닥 사이 높이 하나에서 접촉 그림자의 반지름과 농도를 식으로 뽑아, 가까울수록 작고 짙게, 멀수록 넓고 옅게 칠한다." />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>물체와 바닥 사이 높이 하나에서 접촉 그림자의 반지름과 농도를 식으로 뽑아, 가까울수록 작고 짙게, 멀수록 넓고 옅게 칠한다.</p>
      </div>
    </main>
  );
}
