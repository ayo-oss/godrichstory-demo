// FireLavaHeatCells — vanilla 판(run/314/demo/05-fire-lava-heat-cells/index.html) 의 React 포트.
// 저해상도 격자의 각 셀이 열을 저장하고, 매 프레임
// next[i] = cur[i] + k*(이웃평균 - cur[i]) 확산과 냉각을 반복한다.
// 밝기가 임곗값을 넘는 셀만 용암색 램프로 ImageData/putImageData 로 찍는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireLavaHeatCells.module.scss";

export type FireLavaHeatCellsProps = {
  duration?: string;
  easing?: string;
  color?: string;
  gridWidth?: number;   // 격자 폭(셀) — 변형 "해상도" 축
  kDiff?: number;       // 확산 계수 — 변형 "확산" 축
  ventCount?: number;   // 화구 수 — 변형 "화구" 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Vent = { gx: number; gy: number; amp: number; ph: number };
type Colors = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "용암 열 확산 격자 실험판";
const STILL_TICK = 210;  // reduce 에서 쌓는 시뮬레이션 스텝 수
const T_GLOW = 0.86;     // 코어 임곗값 — 램프 정점
const COOL = 0.006;      // 냉각(방사) 계수

// 시드 고정 PRNG — mulberry32
function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixc(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// 색 램프(256단계) — 굳은 바위 → 잔불 → 주황 → 코어. vanilla 판과 같은 정점표.
function buildRamp(c: Colors): RGB[] {
  const s0: RGB = mixc(c.ink, c.smoke, 0.5);
  const stops: Array<[number, RGB]> = [
    [0.0, c.ink],
    [0.3, s0],
    [0.62, c.ember],
    [0.82, c.amber],
    [1.0, c.gold],
  ];
  const ramp: RGB[] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        const f = (t - stops[s][0]) / (stops[s + 1][0] - stops[s][0]);
        ramp.push(mixc(stops[s][1], stops[s + 1][1], f));
        break;
      }
    }
  }
  return ramp;
}

export default function FireLavaHeatCells({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#d97a52",
  gridWidth = 96,
  kDiff = 0.34,
  ventCount = 5,
}: FireLavaHeatCellsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const rampRef = useRef<RGB[]>([]) as Box<RGB[]>;
  const gwRef = useRef(gridWidth) as Box<number>;
  const ghRef = useRef(0) as Box<number>;
  const kRef = useRef(kDiff) as Box<number>;
  const ventNRef = useRef(ventCount) as Box<number>;
  const ventsRef = useRef<Vent[]>([]) as Box<Vent[]>;
  const heatRef = useRef(new Float32Array(0)) as Box<Float32Array>;
  const heat2Ref = useRef(new Float32Array(0)) as Box<Float32Array>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.7) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const curTRef = useRef(0) as Box<number>;   // 재튜닝: render() 잔열 셔머가 쓰는 최근 시각(step 에서 갱신)
  const [res, setRes] = useState("96×54");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctxRef.current = ctx;
    const GW = gwRef.current;
    const GH = Math.max(24, Math.round(GW * r.height / r.width));
    ghRef.current = GH;
    const buf = document.createElement("canvas");
    buf.width = GW; buf.height = GH;
    const bctx = buf.getContext("2d");
    if (!bctx) return;
    bufRef.current = buf;
    bctxRef.current = bctx;
    imgRef.current = bctx.createImageData(GW, GH);
    heatRef.current = new Float32Array(GW * GH);
    heat2Ref.current = new Float32Array(GW * GH);
    // 화구 — 시드 고정 배치(하단). 재튜닝(2026-09-15): span 으로 화구 수에 맞춰 폭 전체에 고르게 배치
    const rand = makePRNG(0x5eed05);
    const vents: Vent[] = [];
    const span = ventNRef.current > 1 ? 0.78 / (ventNRef.current - 1) : 0;
    for (let v = 0; v < ventNRef.current; v++) {
      vents.push({
        gx: Math.floor(GW * (0.11 + span * v + (rand() - 0.5) * 0.06)),
        gy: Math.floor(GH * (0.72 + (rand() - 0.5) * 0.14)),
        amp: 0.9 + rand() * 0.35,
        ph: rand() * TAU,
      });
    }
    ventsRef.current = vents;
    setRes(GW + "×" + GH);
  }

  // 시뮬레이션 한 스텝 — 화구 주입 → 확산(부유 편향) → 냉각
  function step(tSec: number): void {
    curTRef.current = tSec;
    const GW = gwRef.current, GH = ghRef.current;
    const heat = heatRef.current, heat2 = heat2Ref.current;
    if (!heat || !heat2 || GW < 3 || GH < 3) return;
    const vents = ventsRef.current;
    for (let v = 0; v < vents.length; v++) {
      const vt = vents[v];
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tSec * 1.1 + vt.ph));
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = vt.gx + dx, y = vt.gy + dy;
          if (x < 1 || x >= GW - 1 || y < 1 || y >= GH - 1) continue;
          const falloff = 1 - Math.sqrt(dx * dx + dy * dy) / 4.4;
          if (falloff <= 0) continue;
          heat[y * GW + x] += vt.amp * pulse * 0.1 * falloff;
        }
      }
    }
    if (manualRef.current) {
      const pgx = Math.floor(pxRef.current * (GW - 2)) + 1;
      const pgy = Math.floor(pyRef.current * (GH - 2)) + 1;
      if (pgx >= 1 && pgx < GW - 1 && pgy >= 1 && pgy < GH - 1) {
        heat[pgy * GW + pgx] += 0.12;
      }
    }
    const K = kRef.current;
    for (let yy = 1; yy < GH - 1; yy++) {
      for (let xx = 1; xx < GW - 1; xx++) {
        const i = yy * GW + xx;
        const c = heat[i];
        const nU = heat[i - GW], nD = heat[i + GW], nL = heat[i - 1], nR = heat[i + 1];
        const avg = (nU * 0.9 + nD * 1.1 + nL + nR) / 4;   // 아래 셀 가중 — 위로 자라는 흐름
        let nh = c + K * (avg - c);
        nh = nh - nh * COOL * (0.6 + nh);                  // 방사 냉각 ∝ h
        if (nh < 0) nh = 0;
        if (nh > 1.4) nh = 1.4;
        heat2[i] = nh;
      }
    }
    const tmp = heatRef.current;
    heatRef.current = heat2Ref.current;
    heat2Ref.current = tmp;
  }

  // 렌더 — 열값 → 램프 → ImageData. T_MELT 경계에 로즈 껍질.
  function render(): void {
    const img = imgRef.current, bctx = bctxRef.current, buf = bufRef.current, ctx = ctxRef.current;
    const col = colRef.current, ramp = rampRef.current;
    if (!img || !bctx || !buf || !ctx || !col || ramp.length === 0) return;
    const data = img.data;
    const GW = gwRef.current, GH = ghRef.current;
    const heat = heatRef.current;
    const { w: W, h: H } = sizeRef.current;
    const T_MELT = 0.62;
    let p = 0;
    for (let yy = 0; yy < GH; yy++) {
      for (let xx = 0; xx < GW; xx++) {
        const h = heat[yy * GW + xx];
        const t01 = h >= T_GLOW ? 1 : h / T_GLOW;
        let ci = (t01 * 255) | 0;
        if (ci > 255) ci = 255;
        let r = ramp[ci][0], g = ramp[ci][1], b = ramp[ci][2];
        if (h < T_MELT * 0.5) {
          const k = h / (T_MELT * 0.5);
          // 재튜닝(2026-09-15): 잔열색(ember) 셔머 — 정적 검은 영역을 없앤다(위치+시간 위상)
          const shimmer = 0.05 + 0.05 * Math.sin(curTRef.current * 1.3 + xx * 0.13 + yy * 0.19);
          r = col.ink[0] + (r - col.ink[0]) * k + (col.ember[0] - col.ink[0]) * shimmer;
          g = col.ink[1] + (g - col.ink[1]) * k + (col.ember[1] - col.ink[1]) * shimmer;
          b = col.ink[2] + (b - col.ink[2]) * k + (col.ember[2] - col.ink[2]) * shimmer;
        } else if (h >= T_MELT && h < T_MELT + 0.06) {
          const k2 = (h - T_MELT) / 0.06;
          r = r + (col.rose[0] - r) * 0.35 * (1 - k2);
          g = g + (col.rose[1] - g) * 0.35 * (1 - k2);
          b = b + (col.rose[2] - b) * 0.35 * (1 - k2);
        }
        data[p] = r | 0; data[p + 1] = g | 0; data[p + 2] = b | 0; data[p + 3] = 255;
        p += 4;
      }
    }
    bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0, W, H);
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    step(t);
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) { step(0.9); render(); }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.7; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) { step(0.9); render(); }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gwRef.current = gridWidth;
    kRef.current = kDiff;
    ventNRef.current = ventCount;
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    rampRef.current = buildRamp(colRef.current);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { for (let s = 0; s < STILL_TICK; s++) step(0.9); render(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let s = 0; s < STILL_TICK; s++) step(0.9);
      render();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridWidth, kDiff, ventCount]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>이웃 셀끼리 열을 주고받는 확산 한 단계가 용암이 굳었다 녹는 전부입니다 — 포인터로 화구를 옮깁니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{res}</b> 열 격자 · k {kDiff}</span>
          <span className={styles.metaDim}>ImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
