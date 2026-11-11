// ElasticMorphDrag — vanilla 판(run/421/demo/04-liquid-glass-elastic-morph-drag/index.html) 의 React 포트.
// 판을 끌면 이동 방향으로 살짝 늘어나며 따라오고, 놓으면 언더댐프 스프링
// (exp(-t/τ) * cos(ωt), τ=GLASS_ELASTIC_RETURN_MS·ω=GLASS_ELASTIC_OSC_MS 기반)으로
// 2~3 회 오버슛하며 제자리에 되돌아온다. 가장자리 굴절은 이동한 사각형 기준으로 다시 계산한다.
import { useEffect, useRef } from "react";
import styles from "./ElasticMorphDrag.module.scss";

type Box<T> = { current: T };
type Edge = { f: number; nx: number; ny: number };
type Vec = { x: number; y: number };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };
type KeyEvt = { key: string; preventDefault(): void };

const CALC_W = 160, CALC_H = 100;
const SCENE_W = 160;
const BASE_X0 = 40, BASE_Y0 = 25, BASE_X1 = 120, BASE_Y1 = 75;
const EDGE_BAND = 12;
const GLASS_EDGE_BEND = 5;
const GLASS_ELASTIC_RETURN_MS = 180;
const GLASS_ELASTIC_OSC_MS = 130;
const DRAG_MAX_X = 26, DRAG_MAX_Y = 14;
const PERIOD_MS = 2000;
const DRAG_PHASE_MS = 550;

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
  dragging: boolean;
  dragStartPt: Vec;
  dragOffset: Vec;
  releaseAt: number;
  releasedOffset: Vec;
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

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function elasticSpring(rt: number): number {
  const decay = Math.exp(-rt / GLASS_ELASTIC_RETURN_MS);
  const osc = Math.cos((2 * Math.PI / GLASS_ELASTIC_OSC_MS) * rt);
  return decay * osc;
}

function virtualOffset(t: number): Vec {
  const cyc = t % PERIOD_MS;
  if (cyc < DRAG_PHASE_MS) {
    const p = cyc / DRAG_PHASE_MS;
    const e = 1 - Math.pow(1 - p, 3);
    return { x: DRAG_MAX_X * e, y: DRAG_MAX_Y * e };
  }
  const rt = cyc - DRAG_PHASE_MS;
  const k = elasticSpring(rt);
  return { x: DRAG_MAX_X * k, y: DRAG_MAX_Y * k };
}

export default function ElasticMorphDrag() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
    dragging: false, dragStartPt: { x: 0, y: 0 }, dragOffset: { x: 0, y: 0 },
    releaseAt: -Infinity, releasedOffset: { x: 0, y: 0 },
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > SCENE_W - 1 ? SCENE_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * SCENE_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function currentOffset(t: number): Vec {
    const s = st.current;
    if (s.dragging) return s.dragOffset;
    const rt = t - s.releaseAt;
    if (rt < GLASS_ELASTIC_RETURN_MS * 5) {
      const k = elasticSpring(rt);
      return { x: s.releasedOffset.x * k, y: s.releasedOffset.y * k };
    }
    return virtualOffset(t);
  }

  function renderFrame(t: number): void {
    const outBuf = st.current.outBuf!;
    const off = currentOffset(t);
    const mag = Math.sqrt(off.x * off.x + off.y * off.y);
    const stretch = Math.min(0.35, mag / 44);
    const ux = mag > 0.0001 ? off.x / mag : 0;
    const uy = mag > 0.0001 ? off.y / mag : 0;
    const midX = (BASE_X0 + BASE_X1) / 2, midY = (BASE_Y0 + BASE_Y1) / 2;
    const cx = midX + off.x, cy = midY + off.y;
    const baseHalfW = (BASE_X1 - BASE_X0) / 2, baseHalfH = (BASE_Y1 - BASE_Y0) / 2;
    const halfW = baseHalfW * (1 + stretch * Math.abs(ux));
    const halfH = baseHalfH * (1 + stretch * Math.abs(uy));
    const rx0 = cx - halfW, ry0 = cy - halfH, rx1 = cx + halfW, ry1 = cy + halfH;
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        let rgb: number[];
        if (x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1) {
          const e = boxEdgeSample(x, y, rx0, ry0, rx1, ry1, EDGE_BAND);
          const bendMag = e.f * GLASS_EDGE_BEND;
          const sx = (x - off.x * 0.35) - e.nx * bendMag;
          const sy = (y - off.y * 0.35) - e.ny * bendMag;
          rgb = sampleScene(sx, sy);
          const shine = e.f * 20;
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

  function toGrid(e: PtrEvt): Vec {
    const r = st.current.wrap!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CALC_W,
      y: ((e.clientY - r.top) / r.height) * CALC_H,
    };
  }

  function release(t: number): void {
    const s = st.current;
    s.dragging = false;
    s.releasedOffset = s.dragOffset;
    s.releaseAt = t;
    if (s.reduce) draw(s.lastElapsed);
  }

  function onPointerDown(e: PtrEvt): void {
    const s = st.current;
    s.dragging = true;
    s.dragStartPt = toGrid(e);
    s.dragOffset = { x: 0, y: 0 };
    try { s.wrap!.setPointerCapture(e.pointerId); } catch { /* noop */ }
    if (s.reduce) draw(s.lastElapsed);
  }

  function onPointerMove(e: PtrEvt): void {
    const s = st.current;
    if (!s.dragging) return;
    const g = toGrid(e);
    s.dragOffset = {
      x: clamp(g.x - s.dragStartPt.x, -DRAG_MAX_X * 1.4, DRAG_MAX_X * 1.4),
      y: clamp(g.y - s.dragStartPt.y, -DRAG_MAX_Y * 1.4, DRAG_MAX_Y * 1.4),
    };
    if (s.reduce) draw(s.lastElapsed);
  }

  function onPointerUp(): void {
    release(st.current.lastElapsed);
  }

  function onKeyDown(e: KeyEvt): void {
    const s = st.current;
    let moved = true;
    if (e.key === "ArrowLeft") s.dragOffset = { x: -DRAG_MAX_X, y: 0 };
    else if (e.key === "ArrowRight") s.dragOffset = { x: DRAG_MAX_X, y: 0 };
    else if (e.key === "ArrowUp") s.dragOffset = { x: 0, y: -DRAG_MAX_Y };
    else if (e.key === "ArrowDown") s.dragOffset = { x: 0, y: DRAG_MAX_Y };
    else moved = false;
    if (moved) {
      e.preventDefault();
      release(s.lastElapsed);
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
    const rand = seedRand(421041);
    const sky = pctx.createLinearGradient(0, 0, SCENE_W, CALC_H);
    sky.addColorStop(0, "#e8f6ff");
    sky.addColorStop(1, "#fff0e6");
    pctx.fillStyle = sky;
    pctx.fillRect(0, 0, SCENE_W, CALC_H);
    const cols = ["#6ec8ff", "#ffd23f", "#ff9ebb"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(SCENE_W * (0.24 + i * 0.28), CALC_H * (0.3 + (i % 2) * 0.34), CALC_H * 0.28, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.5;
      pctx.fill();
    }
    pctx.globalAlpha = 1;
    for (let k = 0; k < 46; k += 1) {
      const px = rand() * SCENE_W, py = rand() * CALC_H, r = rand() * 1 + 0.3;
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

    wrap.addEventListener("pointerdown", onPointerDown as unknown as EventListener);
    wrap.addEventListener("pointermove", onPointerMove as unknown as EventListener);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerUp);
    wrap.addEventListener("keydown", onKeyDown as unknown as EventListener);

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerdown", onPointerDown as unknown as EventListener);
      wrap.removeEventListener("pointermove", onPointerMove as unknown as EventListener);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerleave", onPointerUp);
      wrap.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>판을 끌어 당기면 늘어나며 따라오고, 손을 떼면 탄성으로 제자리에 되돌아온다</p>
      </div>
    </main>
  );
}
