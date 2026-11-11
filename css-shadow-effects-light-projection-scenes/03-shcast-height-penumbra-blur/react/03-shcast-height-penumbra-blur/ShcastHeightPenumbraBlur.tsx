import { useEffect, useRef } from "react";
import styles from "./ShcastHeightPenumbraBlur.module.scss";

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

const BLUR_PER_HEIGHT = 0.2;
const CONTACT_ALPHA = 0.62;
const LIFT_MAX = 110;
const LIGHT_LERP = 0.16;
const PLANK_LEFT = 80;
const PLANK_LEN = 320;
const PLANK_THICK = 14;
const STRIPS = 64;
const BASE_Y = 168;
const WALL_RGB = [255, 244, 214];
const FLOOR_RGB = [236, 228, 250];
const SHADOW_RGB = [70, 54, 116];
const PLANK_TOP = [150, 206, 255];
const PLANK_EDGE = [96, 160, 226];

function makeScene(ctx: CanvasRenderingContext2D): Scene {
  let px = 240;
  let py = 160;
  function lift(): number { return LIFT_MAX * clamp((py - 30) / 240, 0, 1); }
  // 가로 위치 u (0 은 닿은 쪽, 1 은 뜬 쪽) 에서 판의 높이
  function heightAt(u: number, total: number): number { return total * u; }
  const scene: Scene = {
    path: function (t: number): Pt {
      const a = PI2 * t / PERIOD_MS;
      return [240 + 170 * Math.sin(a * 2), 150 + 130 * Math.sin(a - 1.2)];
    },
    pos: function (): Pt { return [px, py]; },
    update: function (tx: number, ty: number): void {
      px = lerp(px, tx, LIGHT_LERP);
      py = lerp(py, ty, LIGHT_LERP);
    },
    snap: function (tx: number, ty: number): void { px = tx; py = ty; },
    draw: function (): void {
      const total = lift();
      const slide = (px - 240) / 240;
      ctx.fillStyle = rgba(WALL_RGB, 1);
      ctx.fillRect(0, 0, W, BASE_Y - 20);
      ctx.fillStyle = rgba(FLOOR_RGB, 1);
      ctx.fillRect(0, BASE_Y - 20, W, H - BASE_Y + 20);
      // 그림자 띠 — 띠마다 높이로 번짐과 농도를 따로 계산한다
      for (let i = 0; i < STRIPS; i += 1) {
        const h0 = heightAt(i / STRIPS, total);
        const h1 = heightAt((i + 1) / STRIPS, total);
        const hm = (h0 + h1) / 2;
        const xa = Math.round(PLANK_LEFT + (PLANK_LEN * i) / STRIPS + h0 * slide * 0.9);
        const xb = Math.round(PLANK_LEFT + (PLANK_LEN * (i + 1)) / STRIPS + h1 * slide * 0.9);
        const blur = 2 + hm * BLUR_PER_HEIGHT;
        const alpha = CONTACT_ALPHA / (1 + hm * 0.03);
        const yTop = BASE_Y - 2;
        const yBot = BASE_Y + 16 + hm * 0.5;
        const g = ctx.createLinearGradient(0, yTop - blur, 0, yBot + blur);
        const span = yBot - yTop + 2 * blur;
        g.addColorStop(0, rgba(SHADOW_RGB, 0));
        g.addColorStop(clamp(blur * 1.2 / span, 0, 0.45), rgba(SHADOW_RGB, alpha));
        g.addColorStop(clamp(1 - blur * 1.2 / span, 0.55, 1), rgba(SHADOW_RGB, alpha * 0.85));
        g.addColorStop(1, rgba(SHADOW_RGB, 0));
        ctx.fillStyle = g;
        ctx.fillRect(xa, yTop - blur, xb - xa, span);
      }
      // 판 — 왼쪽 끝은 바닥에 닿고 오른쪽 끝만 들린다
      ctx.beginPath();
      for (let i = 0; i <= STRIPS; i += 1) {
        const hh = heightAt(i / STRIPS, total);
        const x = PLANK_LEFT + (PLANK_LEN * i) / STRIPS;
        const y = BASE_Y - hh * 0.7 - PLANK_THICK;
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      for (let i = STRIPS; i >= 0; i -= 1) {
        const hh = heightAt(i / STRIPS, total);
        ctx.lineTo(PLANK_LEFT + (PLANK_LEN * i) / STRIPS, BASE_Y - hh * 0.7);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(PLANK_TOP, 1);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(PLANK_EDGE, 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PLANK_LEFT, BASE_Y - PLANK_THICK / 2, 5, 0, PI2);
      ctx.fillStyle = rgba(PLANK_EDGE, 1);
      ctx.fill();
      // 광원 표시 — 가로 위치가 그림자가 쏠리는 쪽을 정한다
      glow(ctx, px, 30, 46, [255, 220, 120], 0.9);
      ctx.beginPath();
      ctx.arc(px, 30, 8, 0, PI2);
      ctx.fillStyle = 'rgba(255,246,208,1)';
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

export default function ShcastHeightPenumbraBlur() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="한쪽 끝만 뜬 판에서 바닥 높이에 비례해 그림자의 흐림과 농도를 띠마다 계산해, 맞닿은 곳과 떨어진 곳이 다르게 보인다." />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">시연 중</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>한쪽 끝만 뜬 판에서 바닥 높이에 비례해 그림자의 흐림과 농도를 띠마다 계산해, 맞닿은 곳과 떨어진 곳이 다르게 보인다.</p>
      </div>
    </main>
  );
}
