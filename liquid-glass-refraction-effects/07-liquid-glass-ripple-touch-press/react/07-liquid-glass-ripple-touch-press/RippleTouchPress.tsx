// RippleTouchPress — vanilla 판(run/421/demo/07-liquid-glass-ripple-touch-press/index.html) 의 React 포트.
// 누른 지점에서 거리 기반 감쇠 사인파(물결)를 만들어 그 자리를 중심으로 배경 샘플
// 좌표를 방사형으로 밀어낸다. 가장자리 굴절은 항상 약하게 겹쳐 있다.
import { useEffect, useRef } from "react";
import styles from "./RippleTouchPress.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };
type PtrEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };

const CALC_W = 160, CALC_H = 100;
const PANEL_X0 = 20, PANEL_Y0 = 16, PANEL_X1 = 140, PANEL_Y1 = 84;
const EDGE_BAND = 12;
const GLASS_EDGE_BEND = 4;
const RIPPLE_AMPLITUDE = 6;
const PERIOD_MS = 2000;
const PRESS_SCHEDULE = [40, 740, 1380];
const CENTER_X = (PANEL_X0 + PANEL_X1) / 2;
const CENTER_Y = (PANEL_Y0 + PANEL_Y1) / 2;

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
  pressT: number;
  pressX: number;
  pressY: number;
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

export default function RippleTouchPress() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
    pressT: -Infinity, pressX: CENTER_X, pressY: CENTER_Y,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > CALC_W - 1 ? CALC_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * CALC_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function activePress(t: number): { x: number; y: number; t: number } {
    const s = st.current;
    if (t - s.pressT < 900) return { x: s.pressX, y: s.pressY, t: s.pressT };
    const cyc = t % PERIOD_MS;
    const loopBase = t - cyc;
    let best = PRESS_SCHEDULE[PRESS_SCHEDULE.length - 1] - PERIOD_MS;
    for (const ps of PRESS_SCHEDULE) {
      if (ps <= cyc) best = ps;
    }
    return { x: CENTER_X, y: CENTER_Y, t: loopBase + best };
  }

  function renderFrame(t: number): void {
    const outBuf = st.current.outBuf!;
    const press = activePress(t);
    const age = Math.max(0, t - press.t);
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        let rgb: number[];
        if (x >= PANEL_X0 && x <= PANEL_X1 && y >= PANEL_Y0 && y <= PANEL_Y1) {
          const e = boxEdgeSample(x, y, PANEL_X0, PANEL_Y0, PANEL_X1, PANEL_Y1, EDGE_BAND);
          const dx = x - press.x, dy = y - press.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
          const envelope = Math.exp(-age / 260) * Math.max(0, 1 - dist / 95);
          const wave = Math.sin(dist * 0.3 - age * 0.02) * envelope * RIPPLE_AMPLITUDE;
          const nx = dx / dist, ny = dy / dist;
          const offX = e.nx * (e.f * GLASS_EDGE_BEND) + nx * wave;
          const offY = e.ny * (e.f * GLASS_EDGE_BEND) + ny * wave;
          rgb = sampleScene(x - offX, y - offY);
          const shine = e.f * 16 + Math.max(0, wave) * 8;
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

  function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function onPointerDown(e: PtrEvt): void {
    const s = st.current;
    const g = toGrid(e);
    s.pressX = clamp(g.x, PANEL_X0, PANEL_X1);
    s.pressY = clamp(g.y, PANEL_Y0, PANEL_Y1);
    s.pressT = s.lastElapsed;
    if (s.reduce) draw(s.lastElapsed);
  }

  function onKeyDown(e: KeyEvt): void {
    const s = st.current;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    s.pressX = CENTER_X;
    s.pressY = CENTER_Y;
    s.pressT = s.lastElapsed;
    if (s.reduce) draw(s.lastElapsed);
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
    const rand = seedRand(421071);
    const sky = pctx.createLinearGradient(0, 0, CALC_W, CALC_H);
    sky.addColorStop(0, "#dfe8ff");
    sky.addColorStop(1, "#c9f3e6");
    pctx.fillStyle = sky;
    pctx.fillRect(0, 0, CALC_W, CALC_H);
    const cols = ["#2f6df6", "#4cd4a6", "#b9a0ff"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(CALC_W * (0.22 + i * 0.3), CALC_H * (0.3 + (i % 2) * 0.34), CALC_H * 0.26, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.45;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 50; k += 1) {
      const px = rand() * CALC_W, py = rand() * CALC_H, r = rand() * 1 + 0.3;
      pctx.beginPath();
      pctx.arc(px, py, r, 0, Math.PI * 2);
      pctx.fillStyle = "rgba(255,255,255," + (0.1 + rand() * 0.2) + ")";
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

    wrap.addEventListener("pointerdown", onPointerDown as unknown as EventListener);
    wrap.addEventListener("keydown", onKeyDown as unknown as EventListener);

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerdown", onPointerDown as unknown as EventListener);
      wrap.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>판을 누르면 그 자리를 중심으로 배경이 물결처럼 퍼지며 흔들린다</p>
      </div>
    </main>
  );
}
