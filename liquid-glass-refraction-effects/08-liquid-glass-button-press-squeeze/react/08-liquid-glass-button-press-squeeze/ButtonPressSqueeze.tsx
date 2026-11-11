// ButtonPressSqueeze — vanilla 판(run/421/demo/08-liquid-glass-button-press-squeeze/index.html) 의 React 포트.
// 평소엔 돔 형태로 배경을 볼록하게 확대해 보여주다가, 눌리면 지수 lerp(squeeze) 로
// 볼록함이 줄어 납작해진다. reduced-motion 에서는 실제 입력에만 즉시 반응한다.
import { useEffect, useRef } from "react";
import styles from "./ButtonPressSqueeze.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; repeat: boolean; preventDefault(): void };

const CALC_W = 160, CALC_H = 100;
const BTN_CX = 80, BTN_CY = 50, BTN_HW = 62, BTN_HH = 34;
const BULGE_STRENGTH = 0.5;
const SQUEEZE_MIN = 0.32;
const SQUEEZE_TAU_MS = 90;
const PERIOD_MS = 2000;
const PRESS_WINDOWS: [number, number][] = [[200, 460], [900, 1160], [1500, 1760]];
const RIM_MAX = 44, LIFT_MAX = 42, SHADOW_MAX = 40, HALO_MAX = 38;
const SHADOW_MULT_BASE = 1.15, SHADOW_MULT_K = 0.55;
const HALO_MULT_BASE = 1.45, HALO_MULT_K = 0.75;
const BAND_BASE = 0.72, BAND_K = 0.18;

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
  realPressed: boolean;
  lastInteractionT: number;
  squeeze: number;
}

function seedRand(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function virtualPressed(t: number): boolean {
  const cyc = t % PERIOD_MS;
  for (const [a, b] of PRESS_WINDOWS) {
    if (cyc >= a && cyc <= b) return true;
  }
  return false;
}

export default function ButtonPressSqueeze() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({
    ctx: null, wrap: null, sceneBuf: null, outCtx: null, out: null, outImg: null, outBuf: null,
    cw: 480, ch: 300, lastElapsed: 0, lastTs: null, elapsed: 0, raf: 0, reduce: false,
    realPressed: false, lastInteractionT: -Infinity, squeeze: 1,
  }) as Box<State>;

  function sampleScene(sx: number, sy: number): number[] {
    const buf = st.current.sceneBuf!;
    const cx = sx < 0 ? 0 : sx > CALC_W - 1 ? CALC_W - 1 : sx;
    const cy = sy < 0 ? 0 : sy > CALC_H - 1 ? CALC_H - 1 : sy;
    const i = (Math.round(cy) * CALC_W + Math.round(cx)) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }

  function wantPressed(t: number): boolean {
    const s = st.current;
    if (t - s.lastInteractionT < 2500) return s.realPressed;
    return virtualPressed(t);
  }

  function renderFrame(): void {
    const s = st.current;
    const outBuf = s.outBuf!;
    const squeeze = s.squeeze;
    const k = 1 - squeeze;
    const pressY = BTN_CY + (1 - squeeze) * 3;
    const bandStart = BAND_BASE - k * BAND_K;
    const shadowMult = SHADOW_MULT_BASE + k * SHADOW_MULT_K;
    const haloMult = HALO_MULT_BASE + k * HALO_MULT_K;
    let idx = 0;
    for (let y = 0; y < CALC_H; y += 1) {
      for (let x = 0; x < CALC_W; x += 1) {
        const nx = (x - BTN_CX) / BTN_HW;
        const ny = (y - pressY) / BTN_HH;
        const r2 = nx * nx + ny * ny;
        let rgb: number[];
        if (r2 <= 1) {
          const dome = (1 - r2) * BULGE_STRENGTH * squeeze;
          rgb = sampleScene(x - nx * BTN_HW * dome * 0.5, y - ny * BTN_HH * dome * 0.5);
          const rNorm = Math.sqrt(r2);
          const rim = Math.max(0, (rNorm - bandStart) / (1 - bandStart)) * RIM_MAX * squeeze;
          const lift = (1 - r2) * LIFT_MAX * squeeze;
          const add = rim + lift;
          rgb = [Math.min(255, rgb[0] + add), Math.min(255, rgb[1] + add), Math.min(255, rgb[2] + add)];
        } else {
          rgb = sampleScene(x, y);
          const sdx = (x - BTN_CX) / (BTN_HW * shadowMult);
          const sdy = (y - (pressY + 2)) / (BTN_HH * shadowMult);
          const shadowR2 = sdx * sdx + sdy * sdy;
          if (shadowR2 <= 1) {
            const sh = (1 - shadowR2) * SHADOW_MAX * squeeze;
            rgb = [Math.max(0, rgb[0] - sh), Math.max(0, rgb[1] - sh), Math.max(0, rgb[2] - sh)];
          } else {
            const hdx = (x - BTN_CX) / (BTN_HW * haloMult);
            const hdy = (y - BTN_CY) / (BTN_HH * haloMult);
            const haloR2 = hdx * hdx + hdy * hdy;
            if (haloR2 <= 1) {
              const glow = (1 - haloR2) * HALO_MAX * k;
              rgb = [Math.min(255, rgb[0] + glow), Math.min(255, rgb[1] + glow), Math.min(255, rgb[2] + glow)];
            }
          }
        }
        outBuf[idx] = rgb[0]; outBuf[idx + 1] = rgb[1]; outBuf[idx + 2] = rgb[2]; outBuf[idx + 3] = 255;
        idx += 4;
      }
    }
  }

  function draw(t: number): void {
    const s = st.current;
    s.lastElapsed = t;
    renderFrame();
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
    const target = wantPressed(s.elapsed) ? SQUEEZE_MIN : 1;
    const k = Math.min(1, dt / SQUEEZE_TAU_MS);
    s.squeeze += (target - s.squeeze) * k;
    draw(s.elapsed);
    s.raf = requestAnimationFrame(tick);
  }

  function setPressedDirect(pressed: boolean): void {
    const s = st.current;
    s.squeeze = pressed ? SQUEEZE_MIN : 1;
    draw(s.lastElapsed);
  }

  function onPointerDown(): void {
    const s = st.current;
    s.realPressed = true;
    s.lastInteractionT = s.lastElapsed;
    if (s.reduce) setPressedDirect(true);
  }

  function releasePointer(): void {
    const s = st.current;
    s.realPressed = false;
    s.lastInteractionT = s.lastElapsed;
    if (s.reduce) setPressedDirect(false);
  }

  function onKeyDown(e: KeyEvt): void {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      const s = st.current;
      s.realPressed = true;
      s.lastInteractionT = s.lastElapsed;
      if (s.reduce) setPressedDirect(true);
    }
  }

  function onKeyUp(e: KeyEvt): void {
    if (e.key === "Enter" || e.key === " ") {
      const s = st.current;
      s.realPressed = false;
      s.lastInteractionT = s.lastElapsed;
      if (s.reduce) setPressedDirect(false);
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
    scene.width = CALC_W; scene.height = CALC_H;
    const pctx = scene.getContext("2d")!;
    const rand = seedRand(421081);
    const diag = pctx.createLinearGradient(0, 0, CALC_W, CALC_H);
    diag.addColorStop(0, "#231f28");
    diag.addColorStop(1, "#3a3345");
    pctx.fillStyle = diag;
    pctx.fillRect(0, 0, CALC_W, CALC_H);
    const cols = ["#5b8cf8", "#ffd23f", "#ff9ebb"];
    for (let i = 0; i < cols.length; i += 1) {
      pctx.beginPath();
      pctx.arc(CALC_W * (0.22 + i * 0.3), CALC_H * (0.28 + (i % 2) * 0.36), CALC_H * 0.26, 0, Math.PI * 2);
      pctx.fillStyle = cols[i];
      pctx.globalAlpha = 0.5;
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

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointerup", releasePointer);
    wrap.addEventListener("pointerleave", releasePointer);
    wrap.addEventListener("keydown", onKeyDown as unknown as EventListener);
    wrap.addEventListener("keyup", onKeyUp as unknown as EventListener);

    fit();
    window.addEventListener("resize", fit);
    draw(s.elapsed);
    if (!s.reduce) s.raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", fit);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointerup", releasePointer);
      wrap.removeEventListener("pointerleave", releasePointer);
      wrap.removeEventListener("keydown", onKeyDown as unknown as EventListener);
      wrap.removeEventListener("keyup", onKeyUp as unknown as EventListener);
      cancelAnimationFrame(st.current.raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.lg} is-demo`} ref={rootRef} tabIndex={0}>
        <canvas className={styles.lg__canvas} ref={canvasRef} width={480} height={300} />
        <p className={styles.lg__caption}>평소엔 볼록하게 배경을 확대해 보여주다가, 누르면 볼록함이 줄어 납작하게 눌린다</p>
      </div>
    </main>
  );
}
