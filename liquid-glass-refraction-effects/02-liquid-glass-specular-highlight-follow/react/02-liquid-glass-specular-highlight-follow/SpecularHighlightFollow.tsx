// SpecularHighlightFollow — vanilla 판(run/421/demo/02-liquid-glass-specular-highlight-follow/index.html) 의 React 포트.
// 판 대각선 위 위치(0~1)를 좌표로 두고, 포인터가 그 좌표에 있으면 가우시안 형태 밝기 띠(specular)를
// 더한다. 가장자리는 boxEdgeSample 로 약하게 늘 굴절시켜 유리 느낌을 유지한다.
import { useEffect, useRef } from "react";
import styles from "./SpecularHighlightFollow.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };
type PtrEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };

const CALC_W = 160, CALC_H = 100;
const SCENE_W = 160;
const PANEL_X0 = 20, PANEL_Y0 = 16, PANEL_X1 = 140, PANEL_Y1 = 84;
const EDGE_BAND = 14;
const GLASS_EDGE_BEND = 5;
const HIGHLIGHT_BAND = 0.16;
const HIGHLIGHT_MAX = 150;
const DIAG_SPAN = (PANEL_X1 - PANEL_X0) + (PANEL_Y1 - PANEL_Y0);
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
  pointerActive: boolean;
  pointerDiag: number;
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

function virtualCenter(t: number): number {
  return 0.5 + 0.75 * Math.sin((t * 2 * Math.PI) / PERIOD_MS);
}

export default function SpecularHighlightFollow() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
    pointerActive: false, pointerDiag: 0.5,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > SCENE_W - 1 ? SCENE_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * SCENE_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function renderFrame(t: number): void {
    const s = st.current;
    const outBuf = s.outBuf!;
    const center = s.pointerActive ? s.pointerDiag : virtualCenter(t);
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        let rgb: number[];
        if (x >= PANEL_X0 && x <= PANEL_X1 && y >= PANEL_Y0 && y <= PANEL_Y1) {
          const e = boxEdgeSample(x, y, PANEL_X0, PANEL_Y0, PANEL_X1, PANEL_Y1, EDGE_BAND);
          const mag = e.f * GLASS_EDGE_BEND;
          rgb = sampleScene(x - e.nx * mag, y - e.ny * mag);
          const d = ((x - PANEL_X0) + (y - PANEL_Y0)) / DIAG_SPAN;
          const diff = (d - center) / HIGHLIGHT_BAND;
          const shine = Math.exp(-diff * diff) * HIGHLIGHT_MAX;
          rgb = [Math.min(255, rgb[0] + shine), Math.min(255, rgb[1] + shine), Math.min(255, rgb[2] + shine)];
        } else {
          rgb = sampleScene(x, y);
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

  function toGrid(e: PtrEvt): { x: number; y: number } {
    const r = st.current.wrap!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CALC_W,
      y: ((e.clientY - r.top) / r.height) * CALC_H,
    };
  }

  function onPointerEnter(): void {
    st.current.pointerActive = true;
  }

  function onPointerMove(e: PtrEvt): void {
    const s = st.current;
    s.pointerActive = true;
    const g = toGrid(e);
    s.pointerDiag = Math.max(-0.3, Math.min(1.3, ((g.x - PANEL_X0) + (g.y - PANEL_Y0)) / DIAG_SPAN));
    if (s.reduce) draw(s.lastElapsed);
  }

  function onPointerLeave(): void {
    const s = st.current;
    s.pointerActive = false;
    if (s.reduce) draw(s.lastElapsed);
  }

  function onKeyDown(e: KeyEvt): void {
    const s = st.current;
    let moved = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") s.pointerDiag = Math.max(-0.3, s.pointerDiag - 0.08);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") s.pointerDiag = Math.min(1.3, s.pointerDiag + 0.08);
    else moved = false;
    if (moved) {
      e.preventDefault();
      s.pointerActive = true;
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
    scene.width = SCENE_W; scene.height = CALC_H;
    const pctx = scene.getContext("2d")!;
    const rand = seedRand(421021);
    const sky = pctx.createLinearGradient(0, 0, CALC_W, CALC_H);
    sky.addColorStop(0, "#231f28");
    sky.addColorStop(1, "#3a3345");
    pctx.fillStyle = sky;
    pctx.fillRect(0, 0, SCENE_W, CALC_H);
    const cols = ["#5b8cf8", "#b9a0ff", "#ff9ebb"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(SCENE_W * (0.22 + i * 0.3), CALC_H * (0.35 + (i % 2) * 0.3), CALC_H * 0.3, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.55;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 50; k += 1) {
      const px = rand() * SCENE_W, py = rand() * CALC_H, r = rand() * 1 + 0.3;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.08 + rand() * 0.16) + ")";
      pctx.fill();
    }
    const sceneImg = pctx.getImageData(0, 0, SCENE_W, CALC_H);

    const out = document.createElement("canvas");
    out.width = CALC_W; out.height = CALC_H;
    const outCtx = out.getContext("2d")!;
    const outImg = outCtx.createImageData(CALC_W, CALC_H);

    const s = st.current;
    s.ctx = ctx; s.wrap = wrap; s.sceneBuf = sceneImg.data;
    s.outCtx = outCtx; s.out = out; s.outImg = outImg; s.outBuf = outImg.data;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (s.reduce) { root.classList.remove("is-demo"); }

    wrap.addEventListener("pointerenter", onPointerEnter);
    wrap.addEventListener("pointermove", onPointerMove as unknown as EventListener);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("keydown", onKeyDown as unknown as EventListener);

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerenter", onPointerEnter);
      wrap.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>포인터가 판 위를 지나가는 위치에 맞춰 밝은 반사 띠가 그 자리로 이동한다</p>
      </div>
    </main>
  );
}
