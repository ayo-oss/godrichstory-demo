// AdaptiveTintLuminance — vanilla 판(run/421/demo/05-liquid-glass-adaptive-tint-luminance/index.html) 의 React 포트.
// 판 안쪽 각 픽셀의 배경 밝기(휘도)를 재서, 어두우면 밝히고 밝으면 낮추는 색조를
// 전역 삼각파(adaptivity)로 세기를 오르내리며 더한다.
import { useEffect, useRef } from "react";
import styles from "./AdaptiveTintLuminance.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };

const CALC_W = 160, CALC_H = 100;
const SCENE_W = 220;
const PANEL_X0 = 20, PANEL_Y0 = 16, PANEL_X1 = 140, PANEL_Y1 = 84;
const EDGE_BAND = 14;
const GLASS_EDGE_BEND = 4;
const TINT_STRENGTH = 0.85;
const SCENE_OFFSET_X = (SCENE_W - CALC_W) / 2;
const PAN_AMP = 40;
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

function triangleWave(t: number, period: number): number {
  const cyc = (t % period) / period;
  return cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;
}

export default function AdaptiveTintLuminance() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > SCENE_W - 1 ? SCENE_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * SCENE_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function renderFrame(t: number): void {
    const outBuf = st.current.outBuf!;
    const pan = panX(t);
    const adaptivity = triangleWave(t, PERIOD_MS);
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        const baseSx = x + SCENE_OFFSET_X + pan;
        let rgb: number[];
        if (x >= PANEL_X0 && x <= PANEL_X1 && y >= PANEL_Y0 && y <= PANEL_Y1) {
          const e = boxEdgeSample(x, y, PANEL_X0, PANEL_Y0, PANEL_X1, PANEL_Y1, EDGE_BAND);
          const bendMag = e.f * GLASS_EDGE_BEND;
          rgb = sampleScene(baseSx - e.nx * bendMag, y - e.ny * bendMag);
          const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
          const delta = (128 - lum) * TINT_STRENGTH * adaptivity * 0.5;
          rgb = [rgb[0] + delta, rgb[1] + delta * 0.94, rgb[2] + delta * 0.86];
          const shine = e.f * 18;
          rgb = [
            Math.min(255, Math.max(0, rgb[0] + shine)),
            Math.min(255, Math.max(0, rgb[1] + shine)),
            Math.min(255, Math.max(0, rgb[2] + shine)),
          ];
        } else {
          rgb = sampleScene(baseSx, y);
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
    const rand = seedRand(421051);
    const grad = pctx.createLinearGradient(0, 0, SCENE_W, 0);
    grad.addColorStop(0, "#241f2c");
    grad.addColorStop(0.5, "#5b8cf8");
    grad.addColorStop(1, "#fff2da");
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, SCENE_W, CALC_H);
    const cols = ["#b9a0ff", "#ffd23f", "#ff9ebb"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(SCENE_W * (0.2 + i * 0.3), CALC_H * (0.32 + (i % 2) * 0.32), CALC_H * 0.27, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.5;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 48; k += 1) {
      const px = rand() * SCENE_W, py = rand() * CALC_H, r = rand() * 1 + 0.3;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.08 + rand() * 0.18) + ")";
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
        <p className={styles.lg__caption}>판 안쪽은 배경 밝기를 픽셀마다 재서, 어두우면 밝히고 밝으면 낮추는 색조를 스스로 얹는다</p>
      </div>
    </main>
  );
}
