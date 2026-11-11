// ChromaticEdgeFringe — vanilla 판(run/421/demo/03-liquid-glass-chromatic-edge-fringe/index.html) 의 React 포트.
// R·G·B 채널을 가장자리 거리만큼 서로 다른 오프셋으로 각각 샘플링해, 가장자리로 갈수록
// 색이 살짝 갈라져 보이는 색수차(chromatic fringe)를 흉내낸다.
import { useEffect, useRef } from "react";
import styles from "./ChromaticEdgeFringe.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };

const CALC_W = 160, CALC_H = 100;
const SCENE_W = 260;
const PANEL_X0 = 20, PANEL_Y0 = 16, PANEL_X1 = 140, PANEL_Y1 = 84;
const EDGE_BAND = 18;
const GLASS_BASE_BEND = 6;
const GLASS_CHROMA_SHIFT_PX = 1;
const SCENE_OFFSET_X = (SCENE_W - CALC_W) / 2;
const PAN_AMP = 30;
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

function panX(t: number): number {
  return PAN_AMP * Math.sin((t * 2 * Math.PI) / PERIOD_MS);
}

export default function ChromaticEdgeFringe() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
  }) as Box<State>;

  function sampleChannel(sx: number, sy: number, ch: number): number {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > SCENE_W - 1 ? SCENE_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * SCENE_W + Math.round(cx)) * 4;
    return buf[i + ch];
  }

  function renderFrame(t: number): void {
    const outBuf = st.current.outBuf!;
    const pan = panX(t);
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        const baseSx = x + SCENE_OFFSET_X + pan;
        if (x >= PANEL_X0 && x <= PANEL_X1 && y >= PANEL_Y0 && y <= PANEL_Y1) {
          const e = boxEdgeSample(x, y, PANEL_X0, PANEL_Y0, PANEL_X1, PANEL_Y1, EDGE_BAND);
          const mag = e.f * GLASS_BASE_BEND;
          const chroma = e.f * GLASS_CHROMA_SHIFT_PX * 6;
          const r = sampleChannel(baseSx - e.nx * (mag + chroma), y - e.ny * (mag + chroma), 0);
          const g = sampleChannel(baseSx - e.nx * mag, y - e.ny * mag, 1);
          const b = sampleChannel(baseSx - e.nx * (mag - chroma), y - e.ny * (mag - chroma), 2);
          outBuf[idx] = r; outBuf[idx + 1] = g; outBuf[idx + 2] = b; outBuf[idx + 3] = 255;
        } else {
          outBuf[idx] = sampleChannel(baseSx, y, 0);
          outBuf[idx + 1] = sampleChannel(baseSx, y, 1);
          outBuf[idx + 2] = sampleChannel(baseSx, y, 2);
          outBuf[idx + 3] = 255;
        }
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
    const rand = seedRand(421031);
    const warm = pctx.createLinearGradient(0, 0, SCENE_W, CALC_H);
    warm.addColorStop(0, "#fff2da");
    warm.addColorStop(1, "#ffd9c2");
    pctx.fillStyle = warm;
    pctx.fillRect(0, 0, SCENE_W, CALC_H);
    const cols = ["#2f6df6", "#4cd4a6", "#b9a0ff"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(SCENE_W * (0.2 + i * 0.32), CALC_H * (0.3 + (i % 2) * 0.36), CALC_H * 0.26, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.fill();
    }
    for (let k = 0; k < 50; k += 1) {
      const px = rand() * SCENE_W, py = rand() * CALC_H, r = rand() * 1.1 + 0.4;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
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

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>판 가장자리로 갈수록 배경 색이 빨강·초록·파랑으로 살짝 어긋나 겹쳐 보인다</p>
      </div>
    </main>
  );
}
