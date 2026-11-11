// HeroNavbarScene — vanilla 판(run/421/demo/09-liquid-glass-hero-navbar-scene/index.html) 의 React 포트.
// 아래 장면을 스크롤(휠)해 넘길수록 위 내비게이션 바의 굴절 강도·물결·서리(frost) 블렌드가
// 함께 짙어진다. 내비바 사각형은 좌우로 아주 넓게 잡아(가짜 폭) 위아래 가장자리만 반응한다.
import { useEffect, useRef } from "react";
import styles from "./HeroNavbarScene.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };
type WheelEvt = { deltaY: number; preventDefault(): void };
type KeyEvt = { key: string; preventDefault(): void };

const CALC_W = 160, CALC_H = 100;
const SCENE_H = 220;
const NAV_Y0 = 0, NAV_Y1 = 26;
const EDGE_BAND = 10;
const BASE_BEND = 2, EXTRA_BEND = 7;
const RIPPLE_AMP = 3;
const PAN_RANGE = SCENE_H - CALC_H;
const PERIOD_MS = 2000;

interface State {
  ctx: CanvasRenderingContext2D | null;
  wrap: HTMLElement | null;
  sceneBuf: Uint8ClampedArray | null;
  outCtx: CanvasRenderingContext2D | null;
  out: HTMLCanvasElement | null;
  outImg: ImageData | null;
  outBuf: Uint8ClampedArray | null;
  cw: number; ch: number;
  lastElapsed: number;
  lastTs: number | null;
  elapsed: number;
  raf: number;
  reduce: boolean;
  realProgress: number;
  lastInteractionT: number;
}

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function boxEdgeSample(x: number, y: number, x0: number, y0: number, x1: number, y1: number, band: number): Edge {
  const dl = x - x0, dr = x1 - x, dt = y - y0, db = y1 - y;
  const dmin = Math.min(dl, dr, dt, db);
  if (dmin >= band || dmin < 0) return { f: 0, nx: 0, ny: 0 };
  let nx = 0, ny = 0;
  if (dl < band) nx -= (band - dl);
  if (dr < band) nx += (band - dr);
  if (dt < band) ny -= (band - dt);
  if (db < band) ny += (band - db);
  const len = Math.sqrt(nx * nx + ny * ny);
  if (len > 0.0001) { nx /= len; ny /= len; }
  return { f: Math.max(0, (band - dmin) / band), nx, ny };
}

function triangleWave(t: number, period: number): number {
  const cyc = (t % period) / period;
  return cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export default function HeroNavbarScene() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
    realProgress: 0, lastInteractionT: -Infinity,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > CALC_W - 1 ? CALC_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > SCENE_H - 1 ? SCENE_H - 1 : sy;
    const i = (Math.round(cy) * CALC_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function wantProgress(t: number): number {
    const s = st.current;
    if (t - s.lastInteractionT < 2500) return s.realProgress;
    return triangleWave(t, PERIOD_MS);
  }

  function renderFrame(t: number): void {
    const outBuf = st.current.outBuf!;
    const progress = wantProgress(t);
    const panY = progress * PAN_RANGE;
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        let rgb: number[];
        if (y >= NAV_Y0 && y <= NAV_Y1) {
          const e = boxEdgeSample(x, y, NAV_Y0 - 999, NAV_Y0, NAV_Y0 + 1998, NAV_Y1, EDGE_BAND);
          const bendMag = (BASE_BEND + EXTRA_BEND * progress) * (e.f || 1) * 0.6 + BASE_BEND * 0.4;
          const ripple = Math.sin(x * 0.16 - t * 0.006) * RIPPLE_AMP * progress;
          rgb = sampleScene(x, (y + panY) - e.ny * bendMag - ripple);
          const frost = 60 * progress;
          rgb = [
            Math.min(255, rgb[0] * (1 - progress * 0.25) + frost),
            Math.min(255, rgb[1] * (1 - progress * 0.25) + frost),
            Math.min(255, rgb[2] * (1 - progress * 0.25) + frost),
          ];
        } else {
          rgb = sampleScene(x, y + panY);
        }
        outBuf[idx] = rgb[0]; outBuf[idx + 1] = rgb[1]; outBuf[idx + 2] = rgb[2]; outBuf[idx + 3] = 255;
        idx += 4;
      }
    }
  }

  function draw(t: number): void {
    const s = st.current;
    s.lastElapsed = t;
    renderFrame(t);
    s.outCtx!.putImageData(s.outImg!, 0, 0);
    s.ctx!.clearRect(0, 0, s.cw, s.ch);
    s.ctx!.drawImage(s.out!, 0, 0, CALC_W, CALC_H, 0, 0, s.cw, s.ch);
  }

  function fit(): void {
    const s = st.current;
    const canvas = canvasRef.current;
    if (!s.wrap || !canvas) return;
    const r = s.wrap.getBoundingClientRect();
    s.cw = Math.max(1, Math.round(r.width));
    s.ch = Math.max(1, Math.round(r.height));
    canvas.width = s.cw; canvas.height = s.ch;
    draw(s.lastElapsed);
  }

  function tick(ts: number): void {
    const s = st.current;
    if (s.lastTs === null) s.lastTs = ts;
    const dt = ts - s.lastTs;
    s.lastTs = ts;
    s.elapsed += dt;
    draw(s.elapsed);
    s.raf = requestAnimationFrame(tick);
  }

  function onWheel(e: WheelEvt): void {
    e.preventDefault();
    const s = st.current;
    s.realProgress = clamp(s.realProgress + e.deltaY * 0.0015, 0, 1);
    s.lastInteractionT = s.lastElapsed;
    if (s.reduce) draw(s.lastElapsed);
  }

  function onKeyDown(e: KeyEvt): void {
    const s = st.current;
    let moved = true;
    if (e.key === "ArrowUp" || e.key === "PageUp") s.realProgress = clamp(s.realProgress - 0.12, 0, 1);
    else if (e.key === "ArrowDown" || e.key === "PageDown") s.realProgress = clamp(s.realProgress + 0.12, 0, 1);
    else moved = false;
    if (moved) {
      e.preventDefault();
      s.lastInteractionT = s.lastElapsed;
      if (s.reduce) draw(s.lastElapsed);
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    const wrap = canvas.parentElement;
    if (!ctx || !wrap) return;

    const scene = document.createElement("canvas");
    scene.width = CALC_W; scene.height = SCENE_H;
    const pctx = scene.getContext("2d")!;
    const rand = seedRand(421091);
    const sky = pctx.createLinearGradient(0, 0, 0, SCENE_H);
    sky.addColorStop(0, "#6ec8ff");
    sky.addColorStop(0.55, "#b9a0ff");
    sky.addColorStop(1, "#fff2da");
    pctx.fillStyle = sky;
    pctx.fillRect(0, 0, CALC_W, SCENE_H);
    const cols = ["#5b8cf8", "#4cd4a6", "#ffd23f", "#ff9ebb", "#b9a0ff", "#6ec8ff"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(CALC_W * (0.15 + (i % 3) * 0.35), SCENE_H * (0.15 + Math.floor(i / 3) * 0.4), SCENE_H * 0.1, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.4;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 90; k += 1) {
      const px = rand() * CALC_W, py = rand() * SCENE_H, r = rand() * 1 + 0.3;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.08 + rand() * 0.18) + ")";
      pctx.fill();
    }
    const sceneImg = pctx.getImageData(0, 0, CALC_W, SCENE_H);

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d")!;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);

    const s = st.current;
    s.ctx = ctx; s.wrap = wrap; s.sceneBuf = sceneImg.data;
    s.outCtx = outCtx; s.out = out; s.outImg = outImg; s.outBuf = outImg.data;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (s.reduce) { root.classList.remove("is-demo"); }

    wrap.addEventListener("wheel", onWheel as unknown as EventListener, { passive: false });
    wrap.addEventListener("keydown", onKeyDown as unknown as EventListener);

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("wheel", onWheel as unknown as EventListener);
      wrap.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>아래 장면을 굴려 넘길수록 위 내비게이션 바의 굴절과 물결이 짙어진다</p>
      </div>
    </main>
  );
}
