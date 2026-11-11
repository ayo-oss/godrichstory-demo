// LiquidMetalButton — vanilla 판(run/404/demo/04-btn-canvas-liquid-metal-merge/index.html) 의 React 포트.
// 방울마다 포인터까지의 거리를 세기 값으로 바꾸고, 그 세기 값을 합친 장(場)을 그리드 단위로 계산해
// 문턱을 넘는 자리끼리 색이 이어지도록 렌더한다(메타볼).
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./LiquidMetalButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Blob = { x: number; y: number; r: number };
type Pointer = { x: number; y: number };

const W = 480, H = 300;
const SEED = 40404;
const GRID_STEP = 4;
const GRID_W = Math.floor(W / GRID_STEP);
const GRID_H = Math.floor(H / GRID_STEP);

const BLOB_COUNT = 7;
const R_BASE = 32;
const POINTER_BOOST = 1.5;
const POINTER_FALLOFF = 112;
const BURST_BOOST = 1.7;
const BURST_MS = 520;
const THRESH = 1.0;
const EDGE = 0.42;
const HILITE_SPAN = 1.15;

const METAL_DARK: [number, number, number] = [10, 79, 232];
const METAL_LIGHT: [number, number, number] = [186, 209, 255];
const PAPER_BG: [number, number, number] = [255, 255, 255];

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function buildBlobs(rnd: () => number): Blob[] {
  const list: Blob[] = [];
  const cx0 = W / 2, cy0 = H / 2;
  const rx = 152, ry = 66;
  for (let i = 0; i < BLOB_COUNT; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 0.32 + rnd() * 0.68;
    list.push({
      x: cx0 + Math.cos(ang) * rx * rad,
      y: cy0 + Math.sin(ang) * ry * rad,
      r: R_BASE * (0.72 + rnd() * 0.56),
    });
  }
  return list;
}

export default function LiquidMetalButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null) as Box<HTMLCanvasElement | null>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const blobsRef = useRef<Blob[]>(buildBlobs(makeLcg(SEED))) as Box<Blob[]>;
  const pointerRef = useRef<Pointer | null>(null) as Box<Pointer | null>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const burstUntilRef = useRef<number>(0) as Box<number>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const autoStartRef = useRef<number | null>(null) as Box<number | null>;

  function fieldAt(px: number, py: number, now: number): number {
    const blobs = blobsRef.current;
    const pointer = pointerRef.current;
    const burstUntil = burstUntilRef.current;
    const burstT = now < burstUntil ? clamp01((burstUntil - now) / BURST_MS) : 0;
    const burstBoost = burstT * BURST_BOOST;
    let sum = 0;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      let boost = burstBoost;
      if (pointer) {
        const dpx = pointer.x - b.x, dpy = pointer.y - b.y;
        const distToPointer = Math.sqrt(dpx * dpx + dpy * dpy);
        boost += POINTER_BOOST * Math.exp(-distToPointer / POINTER_FALLOFF);
      }
      const effR = b.r * (1 + boost);
      const dx = px - b.x, dy = py - b.y;
      const dist2 = dx * dx + dy * dy + 1;
      sum += (effR * effR) / dist2;
    }
    return sum;
  }

  function render(now: number): void {
    const cv = cvRef.current;
    const small = smallRef.current;
    const img = imgRef.current;
    if (!cv || !small || !img) return;
    const ctx = cv.getContext("2d");
    const sctx = small.getContext("2d");
    if (!ctx || !sctx) return;
    const data = img.data;
    let p = 0;
    for (let gy = 0; gy < GRID_H; gy++) {
      const py = gy * GRID_STEP + GRID_STEP / 2;
      for (let gx = 0; gx < GRID_W; gx++) {
        const px = gx * GRID_STEP + GRID_STEP / 2;
        const f = fieldAt(px, py, now);
        const alpha = clamp01((f - (THRESH - EDGE)) / (2 * EDGE));
        const hi = clamp01((f - THRESH) / HILITE_SPAN);
        const r = METAL_DARK[0] + (METAL_LIGHT[0] - METAL_DARK[0]) * hi;
        const g = METAL_DARK[1] + (METAL_LIGHT[1] - METAL_DARK[1]) * hi;
        const b2 = METAL_DARK[2] + (METAL_LIGHT[2] - METAL_DARK[2]) * hi;
        data[p] = r | 0; data[p + 1] = g | 0; data[p + 2] = b2 | 0; data[p + 3] = (alpha * 255) | 0;
        p += 4;
      }
    }
    sctx.putImageData(img, 0, 0);
    ctx.fillStyle = "rgb(" + PAPER_BG[0] + "," + PAPER_BG[1] + "," + PAPER_BG[2] + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, GRID_W, GRID_H, 0, 0, W, H);
  }

  function pointFromClient(cx: number, cy: number): [number, number] {
    const cv = cvRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(cx - r.left) * (W / r.width), (cy - r.top) * (H / r.height)];
  }

  function press(): void {
    demoRef.current = false;
    const from = performance.now();
    burstUntilRef.current = from + BURST_MS;
    if (reduceRef.current) render(from);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    press();
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>): void {
    demoRef.current = false;
    const p = pointFromClient(e.clientX, e.clientY);
    pointerRef.current = { x: p[0], y: p[1] };
    if (reduceRef.current) render(performance.now());
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>): void {
    if (demoRef.current) return;
    const p = pointFromClient(e.clientX, e.clientY);
    pointerRef.current = { x: p[0], y: p[1] };
    if (reduceRef.current) render(performance.now());
  }

  function onPointerLeave(): void {
    pointerRef.current = null;
    if (reduceRef.current) render(performance.now());
  }

  function pathPoint(t: number): Pointer {
    const cx = W / 2, cy = H / 2;
    return {
      x: cx + Math.sin(t * 0.0031) * 168 + Math.sin(t * 0.021) * 10,
      y: cy + Math.sin(t * 0.0052 + 1) * 74 + Math.cos(t * 0.017) * 8,
    };
  }

  useEffect(() => {
    const small = document.createElement("canvas");
    small.width = GRID_W; small.height = GRID_H;
    smallRef.current = small;
    const sctx = small.getContext("2d");
    imgRef.current = sctx ? sctx.createImageData(GRID_W, GRID_H) : null;

    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      pointerRef.current = pathPoint(180);
      render(performance.now());
      return;
    }

    function frame(now: number): void {
      if (autoStartRef.current === null) autoStartRef.current = now;
      if (demoRef.current) {
        const t = now - (autoStartRef.current as number);
        pointerRef.current = pathPoint(t);
      }
      render(now);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lm}>
        <canvas
          className={styles.cv}
          ref={cvRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        />
        <button className={styles.btn} ref={btnRef} type="button" onClick={press} onKeyDown={onKeyDown}>
          전송
        </button>
        <p className={styles.hint}>버튼 위로 커서를 움직이면 방울이 하나로 뭉칩니다</p>
      </div>
    </main>
  );
}
