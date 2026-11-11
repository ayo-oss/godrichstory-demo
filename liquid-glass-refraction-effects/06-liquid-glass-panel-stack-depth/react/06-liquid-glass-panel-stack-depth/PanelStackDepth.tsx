// PanelStackDepth — vanilla 판(run/421/demo/06-liquid-glass-panel-stack-depth/index.html) 의 React 포트.
// 유리 판 세 장이 각자 다른 진폭·주파수·위상으로 위아래로 떠오르고, 일정 구간마다
// 그리는 순서(앞뒤 겹침)가 rotate 된다. depthFor 로 각 판의 스택 깊이(앞 0→뒤 n)를 구해
// 굴절(bend)·그림자(shadow)·흐림(blur, 굴절 샘플 반경)이 깊이에 비례해 늘어나게 하고,
// 순서가 바뀌는 구간에서는 STACK_TRANSITION_MS 동안 이전 깊이에서 새 깊이로 lerp 한다.
import { useEffect, useRef } from "react";
import styles from "./PanelStackDepth.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };
type Panel = { x0: number; y0: number; x1: number; y1: number; amp: number; freq: number; phase: number; bend: number; shine: number };

const CALC_W = 160, CALC_H = 100;
const EDGE_BAND = 10;
const PERIOD_MS = 2000;
const SLOT_MS = PERIOD_MS / 3;
const STACK_TRANSITION_MS = 220;
const BEND_PER_DEPTH = 3;
const BLUR_RADIUS_PER_DEPTH = 1.4;
const SHADOW_BASE_SIZE = 5;
const SHADOW_SIZE_PER_DEPTH = 2.5;
const SHADOW_BASE_ALPHA = 0.14;
const SHADOW_ALPHA_PER_DEPTH = 0.1;

const PANELS: Panel[] = [
  { x0: 24, y0: 20, x1: 84, y1: 62, amp: 8, freq: 1, phase: 0, bend: 5, shine: 20 },
  { x0: 58, y0: 34, x1: 118, y1: 76, amp: 6, freq: 1.4, phase: 1.4, bend: 4, shine: 16 },
  { x0: 90, y0: 24, x1: 148, y1: 66, amp: 10, freq: 0.8, phase: 3.0, bend: 6, shine: 22 },
];

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

function orderForSlot(slot: number): number[] {
  const s = ((slot % 3) + 3) % 3;
  if (s === 0) return [0, 1, 2];
  if (s === 1) return [1, 2, 0];
  return [2, 0, 1];
}

function stackOrder(t: number): number[] {
  return orderForSlot(Math.floor((t % PERIOD_MS) / SLOT_MS));
}

function depthFor(panelIdx: number, t: number): number {
  const cyc = t % PERIOD_MS;
  const slot = Math.floor(cyc / SLOT_MS);
  const tSlot = cyc - slot * SLOT_MS;
  const curOrder = orderForSlot(slot);
  const prevOrder = orderForSlot(slot - 1);
  const curDepth = (PANELS.length - 1) - curOrder.indexOf(panelIdx);
  const prevDepth = (PANELS.length - 1) - prevOrder.indexOf(panelIdx);
  const blend = Math.min(1, tSlot / STACK_TRANSITION_MS);
  const e = 1 - Math.pow(1 - blend, 2);
  return prevDepth + (curDepth - prevDepth) * e;
}

function darkenBand(outBuf: Uint8ClampedArray, x0: number, y1: number, x1: number, bandH: number, alpha: number): void {
  const yMax = Math.min(CALC_H - 1, Math.ceil(y1 + bandH));
  for (let y = Math.max(0, Math.floor(y1)); y <= yMax; y += 1) {
    const f = Math.max(0, 1 - (y - y1) / bandH);
    const mul = 1 - alpha * f;
    const xLo = Math.max(0, Math.floor(x0 - 3));
    const xHi = Math.min(CALC_W - 1, Math.ceil(x1 + 3));
    for (let x = xLo; x <= xHi; x += 1) {
      const i = (y * CALC_W + x) * 4;
      outBuf[i] = outBuf[i] * mul;
      outBuf[i + 1] = outBuf[i + 1] * mul;
      outBuf[i + 2] = outBuf[i + 2] * mul;
    }
  }
}

export default function PanelStackDepth() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > CALC_W - 1 ? CALC_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * CALC_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function renderFrame(t: number): void {
    const s = st.current;
    const outBuf = s.outBuf!;
    outBuf.set(s.sceneBuf!);
    const order = stackOrder(t);
    for (const pi of order) {
      const p = PANELS[pi];
      const depth = depthFor(pi, t);
      const bend = p.bend + depth * BEND_PER_DEPTH;
      const blurR = depth * BLUR_RADIUS_PER_DEPTH;
      const shadowSize = SHADOW_BASE_SIZE + depth * SHADOW_SIZE_PER_DEPTH;
      const shadowAlpha = SHADOW_BASE_ALPHA + depth * SHADOW_ALPHA_PER_DEPTH;
      const bobY = p.amp * Math.sin(((t * 2 * Math.PI) / PERIOD_MS) * p.freq + p.phase);
      const rx0 = p.x0, ry0 = p.y0 + bobY, rx1 = p.x1, ry1 = p.y1 + bobY;
      darkenBand(outBuf, rx0, ry1, rx1, shadowSize, shadowAlpha);
      const yLo = Math.max(0, Math.floor(ry0)), yHi = Math.min(CALC_H - 1, Math.ceil(ry1));
      const xLo = Math.max(0, Math.floor(rx0)), xHi = Math.min(CALC_W - 1, Math.ceil(rx1));
      for (let y = yLo; y <= yHi; y += 1) {
        for (let x = xLo; x <= xHi; x += 1) {
          const e = boxEdgeSample(x, y, rx0, ry0, rx1, ry1, EDGE_BAND);
          const mag = e.f * bend;
          const sx = x - e.nx * mag;
          const sy = (y - bobY) - e.ny * mag;
          let rgb: number[];
          if (blurR > 0.05) {
            const c0 = sampleScene(sx, sy);
            const c1 = sampleScene(sx - blurR, sy);
            const c2 = sampleScene(sx + blurR, sy);
            const c3 = sampleScene(sx, sy - blurR);
            const c4 = sampleScene(sx, sy + blurR);
            rgb = [
              (c0[0] + c1[0] + c2[0] + c3[0] + c4[0]) / 5,
              (c0[1] + c1[1] + c2[1] + c3[1] + c4[1]) / 5,
              (c0[2] + c1[2] + c2[2] + c3[2] + c4[2]) / 5,
            ];
          } else {
            rgb = sampleScene(sx, sy);
          }
          const sh = e.f * p.shine;
          const i = (y * CALC_W + x) * 4;
          outBuf[i] = Math.min(255, rgb[0] + sh);
          outBuf[i + 1] = Math.min(255, rgb[1] + sh);
          outBuf[i + 2] = Math.min(255, rgb[2] + sh);
          outBuf[i + 3] = 255;
        }
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
    scene.width = CALC_W; scene.height = CALC_H;
    const pctx = scene.getContext("2d")!;
    const rand = seedRand(421061);
    const sky = pctx.createLinearGradient(0, 0, CALC_W, CALC_H);
    sky.addColorStop(0, "#fff0e6");
    sky.addColorStop(1, "#e8f6ff");
    pctx.fillStyle = sky;
    pctx.fillRect(0, 0, CALC_W, CALC_H);
    const cols = ["#6ec8ff", "#ffd23f", "#ff9ebb", "#b9a0ff"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(CALC_W * (0.16 + i * 0.24), CALC_H * (0.3 + (i % 2) * 0.34), CALC_H * 0.24, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.45;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 46; k += 1) {
      const px = rand() * CALC_W, py = rand() * CALC_H, r = rand() * 1 + 0.3;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.08 + rand() * 0.18) + ")";
      pctx.fill();
    }
    const sceneImg = pctx.getImageData(0, 0, CALC_W, CALC_H);

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
        <p className={styles.lg__caption}>깊이가 다른 유리 판 세 장이 각자 다른 리듬으로 떠오르며 앞뒤 순서가 바뀐다</p>
      </div>
    </main>
  );
}
