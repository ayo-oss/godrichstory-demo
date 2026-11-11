// ElectricArcButton — vanilla 판(run/404/demo/05-btn-canvas-electric-arc-edge/index.html) 의 React 포트.
// 02번 크랙 데모의 균열 각도 값(6)을 전류 선 굵기 계산에 재사용하고, 호버 세기 값이 오르내리는 만큼
// 테두리 앵커가 튀는 폭과 아크 글로우 필드의 밝기가 함께 커진다.
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ElectricArcButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Pt = { x: number; y: number };

const W = 480, H = 300;
const SEED = 50510;

// 02번(btn-canvas-crack-shatter-press)의 BTN_CANVAS_CRACK_BRANCH_COUNT(=6) 값을
// 이 편의 "테두리를 도는 전류 굵기" 계산에 그대로 재사용한다 (훅 참고).
const CRACK_VALUE_ECHO = 6;

const BTN_CANVAS_ARC_JITTER_MS = 70;

const ARC_SEGMENTS = 6;
const SUBDIV = 12;
const JITTER_AMP_MAX = 28;
const GLOW_DECAY = 0.90;
const GLOW_CELL = 6;
const GLOW_COLS = Math.floor(W / GLOW_CELL);
const GLOW_ROWS = Math.floor(H / GLOW_CELL);
const GLOW_COLOR: [number, number, number] = [110, 206, 255];
const BG: [number, number, number] = [23, 20, 26];

const RX = 158, RY = 68;
const CX = W / 2, CY = H / 2;

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function ElectricArcButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const smallRef = useRef<HTMLCanvasElement | null>(null) as Box<HTMLCanvasElement | null>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const fieldRef = useRef<Float32Array>(new Float32Array(GLOW_COLS * GLOW_ROWS)) as Box<Float32Array>;
  const anchorsRef = useRef<number[]>(new Array(ARC_SEGMENTS).fill(0)) as Box<number[]>;
  const intensityRef = useRef<number>(0) as Box<number>;
  const targetRef = useRef<number>(0) as Box<number>;
  const lastJitterRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number | null>(null) as Box<number | null>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;

  function stampGlow(px: number, py: number, strength: number): void {
    const field = fieldRef.current;
    const gx = Math.floor(px / GLOW_CELL), gy = Math.floor(py / GLOW_CELL);
    for (let oy = -2; oy <= 2; oy++) {
      for (let ox = -2; ox <= 2; ox++) {
        const xx = gx + ox, yy = gy + oy;
        if (xx < 0 || yy < 0 || xx >= GLOW_COLS || yy >= GLOW_ROWS) continue;
        const d = Math.sqrt(ox * ox + oy * oy);
        const w = d === 0 ? 1 : Math.max(0, 1 - d / 2.6);
        field[yy * GLOW_COLS + xx] += strength * w;
      }
    }
  }

  function pathPoints(): Pt[] {
    const anchors = anchorsRef.current;
    const pts: Pt[] = [];
    for (let i = 0; i < ARC_SEGMENTS; i++) {
      const a0 = anchors[i], a1 = anchors[(i + 1) % ARC_SEGMENTS];
      for (let s = 0; s < SUBDIV; s++) {
        const u = s / SUBDIV;
        const w = (1 - Math.cos(u * Math.PI)) / 2;
        const jitter = a0 + (a1 - a0) * w;
        const ang = ((i + u) / ARC_SEGMENTS) * Math.PI * 2;
        const rr = 1 + jitter / ((RX + RY) / 2);
        pts.push({ x: CX + Math.cos(ang) * RX * rr, y: CY + Math.sin(ang) * RY * rr });
      }
    }
    return pts;
  }

  function render(now: number, dt: number): void {
    const cv = cvRef.current;
    const small = smallRef.current;
    const img = imgRef.current;
    if (!cv || !small || !img) return;
    const ctx = cv.getContext("2d");
    const sctx = small.getContext("2d");
    if (!ctx || !sctx) return;
    const rnd = rndRef.current;
    const anchors = anchorsRef.current;
    const field = fieldRef.current;

    intensityRef.current += (targetRef.current - intensityRef.current) * Math.min(1, dt * 7);
    const intensity = intensityRef.current;

    if (now - lastJitterRef.current >= BTN_CANVAS_ARC_JITTER_MS) {
      lastJitterRef.current = now;
      for (let i = 0; i < ARC_SEGMENTS; i++) {
        anchors[i] = (rnd() - 0.5) * 2 * JITTER_AMP_MAX * (0.12 + intensity);
      }
    }

    for (let f = 0; f < field.length; f++) field[f] *= GLOW_DECAY;

    const pts = pathPoints();
    for (let p = 0; p < pts.length; p++) {
      stampGlow(pts[p].x, pts[p].y, 0.62 + intensity * 2.0);
    }

    const data = img.data;
    let idx = 0;
    for (let gy = 0; gy < GLOW_ROWS; gy++) {
      for (let gx = 0; gx < GLOW_COLS; gx++) {
        const v = Math.min(1, field[gy * GLOW_COLS + gx] / 2.4);
        data[idx] = GLOW_COLOR[0]; data[idx + 1] = GLOW_COLOR[1]; data[idx + 2] = GLOW_COLOR[2];
        data[idx + 3] = (v * 255) | 0;
        idx += 4;
      }
    }
    sctx.putImageData(img, 0, 0);

    ctx.fillStyle = "rgb(" + BG[0] + "," + BG[1] + "," + BG[2] + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, GLOW_COLS, GLOW_ROWS, 0, 0, W, H);

    const lineWidth = 1 + intensity * CRACK_VALUE_ECHO;
    ctx.beginPath();
    for (let q = 0; q < pts.length; q++) {
      if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y);
    }
    ctx.closePath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = "rgba(" + GLOW_COLOR[0] + "," + GLOW_COLOR[1] + "," + GLOW_COLOR[2] + "," + (0.55 + intensity * 0.45).toFixed(3) + ")";
    ctx.stroke();
  }

  function setHover(on: boolean): void {
    targetRef.current = on ? 1 : 0;
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    demoRef.current = false;
    setHover(true);
    if (reduceRef.current) render(performance.now(), 0.05);
  }

  function onPointerEnter(): void {
    demoRef.current = false;
    setHover(true);
    if (reduceRef.current) render(performance.now(), 0.05);
  }
  function onPointerLeave(): void {
    setHover(false);
    if (reduceRef.current) render(performance.now(), 0.05);
  }
  function onClick(): void {
    demoRef.current = false;
    setHover(true);
    if (reduceRef.current) render(performance.now(), 0.05);
  }
  function onPointerDown(_e: ReactPointerEvent<HTMLCanvasElement>): void {
    demoRef.current = false;
    setHover(true);
    if (reduceRef.current) render(performance.now(), 0.05);
  }

  useEffect(() => {
    const small = document.createElement("canvas");
    small.width = GLOW_COLS; small.height = GLOW_ROWS;
    smallRef.current = small;
    const sctx = small.getContext("2d");
    imgRef.current = sctx ? sctx.createImageData(GLOW_COLS, GLOW_ROWS) : null;

    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      const rnd = rndRef.current;
      targetRef.current = 0.6;
      intensityRef.current = 0.6;
      const anchors = anchorsRef.current;
      for (let i = 0; i < ARC_SEGMENTS; i++) anchors[i] = (rnd() - 0.5) * 2 * JITTER_AMP_MAX * 0.6;
      render(performance.now(), 0.05);
      return;
    }

    function frame(now: number): void {
      const last = lastTRef.current;
      const dt = last === null ? 0.016 : Math.min(0.05, (now - last) / 1000);
      lastTRef.current = now;
      if (demoRef.current) {
        const t = now % 2400;
        targetRef.current = t < 1400 ? Math.min(1, t / 500) : Math.max(0, 1 - (t - 1400) / 700);
      }
      render(now, dt);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ae}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={onPointerDown} />
        <button
          className={styles.btn}
          ref={btnRef}
          type="button"
          onClick={onClick}
          onKeyDown={onKeyDown}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        >
          시작하기
        </button>
        <p className={styles.hint}>버튼에 커서를 올리면 테두리가 전류처럼 떨립니다</p>
      </div>
    </main>
  );
}
