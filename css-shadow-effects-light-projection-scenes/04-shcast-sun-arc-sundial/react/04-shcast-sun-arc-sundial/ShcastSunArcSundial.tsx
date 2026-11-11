import { useEffect, useRef } from "react";
import styles from "./ShcastSunArcSundial.module.scss";

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

const SUN_ARC_DEG = 160;
const SHADOW_LEN_MAX = 140;
const GNOMON_HEIGHT = 60;
const DIAL_RADIUS = 112;
const SUN_RING_RADIUS = 134;
const ELEV_LOW_DEG = 14;
const ELEV_SPAN_DEG = 56;
const LIGHT_LERP = 0.2;
const DIAL_X = 240;
const DIAL_Y = 160;
const BG_RGB = [255, 244, 222];
const PLATE_RGB = [214, 232, 255];
const INK_RGB = [74, 56, 120];
const SUN_RGB = [255, 214, 120];

function makeScene(ctx: CanvasRenderingContext2D): Scene {
  let ux = 0.04;
  // 해의 진행 u (0 은 해 뜬 직후, 1 은 지기 직전) 를 화면 각도로 바꾼다
  function sunAngle(u: number): number {
    const mid = 270;
    return (mid - SUN_ARC_DEG / 2 + u * SUN_ARC_DEG) * Math.PI / 180;
  }
  function elevation(u: number): number { return (ELEV_LOW_DEG + ELEV_SPAN_DEG * Math.sin(Math.PI * u)) * Math.PI / 180; }
  const scene: Scene = {
    path: function (t: number): Pt {
      const c = (t / PERIOD_MS) % 1;
      const tri = c < 0.5 ? c * 2 : 2 - c * 2;
      return [W * (0.04 + 0.92 * smooth(tri)), DIAL_Y];
    },
    pos: function (): Pt { return [ux * W, DIAL_Y]; },
    update: function (tx: number): void { ux = lerp(ux, clamp(tx / W, 0, 1), LIGHT_LERP); },
    snap: function (tx: number): void { ux = clamp(tx / W, 0, 1); },
    draw: function (): void {
      const phi = sunAngle(ux);
      const e = elevation(ux);
      const len = Math.min(SHADOW_LEN_MAX, GNOMON_HEIGHT / Math.tan(e));
      ctx.fillStyle = rgba(BG_RGB, 1);
      ctx.fillRect(0, 0, W, H);
      // 해가 지나는 호
      ctx.beginPath();
      ctx.arc(DIAL_X, DIAL_Y, SUN_RING_RADIUS, sunAngle(0), sunAngle(1));
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(214,170,70,0.75)';
      ctx.stroke();
      ctx.setLineDash([]);
      // 해시계 판 — 해가 높을수록 밝다
      ctx.save();
      ctx.beginPath();
      ctx.arc(DIAL_X, DIAL_Y, DIAL_RADIUS, 0, PI2);
      ctx.fillStyle = rgba(PLATE_RGB, 1);
      ctx.fill();
      ctx.clip();
      const sx = DIAL_X + Math.cos(phi) * SUN_RING_RADIUS;
      const sy = DIAL_Y + Math.sin(phi) * SUN_RING_RADIUS;
      glow(ctx, sx, sy, 230, SUN_RGB, 0.55 + 0.4 * Math.sin(Math.PI * ux));
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(150,170,230,0.9)';
      ctx.beginPath();
      ctx.arc(DIAL_X, DIAL_Y, DIAL_RADIUS, 0, PI2);
      ctx.stroke();
      // 눈금 — 해가 8 등분 지점에 있을 때 그림자 끝이 닿는 방향
      for (let k = 0; k <= 8; k += 1) {
        const a = sunAngle(k / 8) + Math.PI;
        ctx.beginPath();
        ctx.moveTo(DIAL_X + Math.cos(a) * 92, DIAL_Y + Math.sin(a) * 92);
        ctx.lineTo(DIAL_X + Math.cos(a) * 106, DIAL_Y + Math.sin(a) * 106);
        ctx.lineWidth = k % 4 === 0 ? 4 : 2;
        ctx.strokeStyle = 'rgba(96,110,190,0.85)';
        ctx.stroke();
      }
      // 그림자 — 해 반대쪽으로 길이 = 막대 높이 / tan(고도)
      const da = phi + Math.PI;
      const tipX = DIAL_X + Math.cos(da) * len;
      const tipY = DIAL_Y + Math.sin(da) * len;
      const nx = -Math.sin(da) * 6;
      const ny = Math.cos(da) * 6;
      ctx.beginPath();
      ctx.moveTo(DIAL_X + nx, DIAL_Y + ny);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(DIAL_X - nx, DIAL_Y - ny);
      ctx.closePath();
      ctx.fillStyle = rgba(INK_RGB, 0.52);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, PI2);
      ctx.fillStyle = rgba(INK_RGB, 0.8);
      ctx.fill();
      // 막대 윗부분과 해
      ctx.beginPath();
      ctx.arc(DIAL_X, DIAL_Y - 4, 7, 0, PI2);
      ctx.fillStyle = 'rgba(255,196,176,1)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(214,120,100,0.95)';
      ctx.stroke();
      glow(ctx, sx, sy, 34, SUN_RGB, 0.95);
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, PI2);
      ctx.fillStyle = 'rgba(255,240,186,1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(224,170,60,0.95)';
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

export default function ShcastSunArcSundial() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="해의 고도각 하나에서 그림자 길이를 높이 나누기 탄젠트로 구하고, 정해진 호를 따라 방향과 길이를 바꾼다." />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>해의 고도각 하나에서 그림자 길이를 높이 나누기 탄젠트로 구하고, 정해진 호를 따라 방향과 길이를 바꾼다.</p>
      </div>
    </main>
  );
}
