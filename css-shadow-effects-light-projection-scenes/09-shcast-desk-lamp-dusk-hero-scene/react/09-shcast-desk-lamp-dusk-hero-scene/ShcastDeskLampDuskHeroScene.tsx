import { useEffect, useRef } from "react";
import styles from "./ShcastDeskLampDuskHeroScene.module.scss";

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

const DUSK_FRAMES = 125;
const LAMP_HEIGHT = 150;
const SUN_HEIGHT_NOON = 420;
const SUN_HEIGHT_DUSK = 70;
const LIGHT_LERP = 0.2;
const DUSK_MS = DUSK_FRAMES * FIXED_DT;
const DESK_DAY = [244, 226, 200];
const DESK_NIGHT = [52, 46, 92];
const INK_RGB = [66, 48, 112];
const SUN_RGB = [255, 206, 120];
const LAMP_RGB = [255, 214, 140];
const LAMP_SPOT = [404, 74];
const SUN_SPOT = [-60, 96];
const ITEMS = [[104, 168, 188, 218, 16], [236, 188, 270, 222, 40], [312, 128, 344, 160, 56]];
const ITEM_TOPS = [[255, 214, 204], [190, 226, 255], [180, 240, 216]];
const ITEM_FRONTS = [[226, 150, 140], [120, 176, 230], [110, 200, 160]];

function makeScene(ctx: CanvasRenderingContext2D): Scene {
  let px = 0;
  const scene: Scene = {
    path: function (t: number): Pt {
      const c = (t / (DUSK_MS * 2)) % 1;
      const tri = c < 0.5 ? c * 2 : 2 - c * 2;
      return [W * smooth(tri), 150];
    },
    pos: function (): Pt { return [px, 150]; },
    update: function (tx: number): void { px = lerp(px, tx, LIGHT_LERP); },
    snap: function (tx: number): void { px = tx; },
    draw: function (): void {
      const p = clamp(px / W, 0, 1);
      const night = smooth(p);
      const lampOn = smooth((p - 0.35) / 0.4);
      const sunAlpha = 1 - 0.9 * smooth((p - 0.55) / 0.45);
      const desk = [lerp(DESK_DAY[0], DESK_NIGHT[0], night), lerp(DESK_DAY[1], DESK_NIGHT[1], night), lerp(DESK_DAY[2], DESK_NIGHT[2], night)];
      ctx.fillStyle = rgba(desk, 1);
      ctx.fillRect(0, 0, W, H);
      glow(ctx, SUN_SPOT[0] + 20, SUN_SPOT[1], 380, SUN_RGB, 0.7 * sunAlpha);
      glow(ctx, LAMP_SPOT[0], LAMP_SPOT[1], 280, LAMP_RGB, 0.9 * lampOn);
      const sunH = lerp(SUN_HEIGHT_NOON, SUN_HEIGHT_DUSK, smooth(p));
      for (let i = 0; i < ITEMS.length; i += 1) {
        const r = ITEMS[i];
        fillShadow(ctx, boxShadow(SUN_SPOT[0], SUN_SPOT[1], sunH, r[0], r[1], r[2], r[3], r[4]), INK_RGB, 0.4 * sunAlpha);
        fillShadow(ctx, boxShadow(LAMP_SPOT[0], LAMP_SPOT[1], LAMP_HEIGHT, r[0], r[1], r[2], r[3], r[4]), INK_RGB, 0.5 * lampOn);
      }
      for (let i = 0; i < ITEMS.length; i += 1) {
        const r = ITEMS[i];
        drawBlock(ctx, r[0], r[1], r[2], r[3], r[4], ITEM_TOPS[i], ITEM_FRONTS[i]);
      }
      // 램프 머리 — 켜지면 빛이 번진다
      ctx.beginPath();
      ctx.arc(LAMP_SPOT[0], LAMP_SPOT[1], 15, 0, PI2);
      ctx.fillStyle = rgba([lerp(236, 255, lampOn), lerp(214, 244, lampOn), lerp(206, 186, lampOn)], 1);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(200,170,120,0.95)';
      ctx.stroke();
      // 해의 높이를 알려 주는 창 표시
      glow(ctx, 20, SUN_SPOT[1], 36, SUN_RGB, 0.9 * sunAlpha);
      ctx.fillStyle = rgba(SUN_RGB, Math.max(sunAlpha, 0.15));
      ctx.fillRect(0, SUN_SPOT[1] - 22, 8, 44);
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

export default function ShcastDeskLampDuskHeroScene() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="앞의 투영·흐림·해 높이 계산을 한 장면에 모아, 해 그림자가 길어지다 사라지면 램프 그림자가 이어받는다." />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>앞의 투영·흐림·해 높이 계산을 한 장면에 모아, 해 그림자가 길어지다 사라지면 램프 그림자가 이어받는다.</p>
      </div>
    </main>
  );
}
