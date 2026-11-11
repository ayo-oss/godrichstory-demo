// FuelSpreadGrid — vanilla 판(run/314/demo/09-fire-spread-fuel-grid/index.html) 의 React 포트.
// 셀 격자마다 연료(fuel)를 저장하고, 타는 칸(heat > 점화 문턱)이 이웃 8칸에 열을 넘기며
// 자기 연료를 닳는다 — 연료 0칸은 꺼진다. 렌더는 ImageData 픽셀을 셀 단위로 직접 써서
// putImageData 로 올린다(셀당 1픽셀 버퍼를 캔버스로 확대). 자동 재생만 — 실측 입력 없음.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FuelSpreadGrid.module.scss";

export type FuelSpreadGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
  cols?: number;      // 격자 가로 칸 수 — 변형 "격자 촘촘함" 축(72 → 168)
  spread?: number;    // 이웃 열 전달률 — 변형 "번짐 속도" 축
  burnRate?: number;  // 프레임당 연료 소모율 — 변형 "지속력" 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Cols = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };
type Grid = { rows: number; fuel: Float32Array; heat: Float32Array; nheat: Float32Array };

const IGNITE = 0.34;      // 점화 문턱
const SPARK_EVERY = 30;   // 자동 점화 간격(프레임) — 시드 고정 순서로 옮겨 다닌다
const FIELD_LABEL = "불씨 확산 실험판";

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 지형·같은 번짐으로 재생된다
const SEED = 0x5eed09;
let prngState = SEED >>> 0;
function rand(): number {
  prngState = (prngState + 0x6D2B79F5) >>> 0;
  let t = prngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function resetRand(): void { prngState = SEED >>> 0; }

export default function FuelSpreadGrid({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0a868",
  cols = 120,
  spread = 0.115,
  burnRate = 0.0032,
}: FuelSpreadGridProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Cols | null>(null);
  const colsRef = useRef(cols) as Box<number>;
  const spreadRef = useRef(spread) as Box<number>;
  const burnRateRef = useRef(burnRate) as Box<number>;
  const gridRef = useRef<Grid>({ rows: 0, fuel: new Float32Array(0), heat: new Float32Array(0), nheat: new Float32Array(0) }) as Box<Grid>;
  const bufRef = useRef<HTMLCanvasElement | null>(null);
  const bctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imgRef = useRef<ImageData | null>(null);
  const rafRef = useRef(0) as Box<number>;
  const frameNoRef = useRef(0) as Box<number>;
  const sparkAtRef = useRef(0) as Box<number>;
  const [grid, setGrid] = useState("120×52");
  const [fires, setFires] = useState(0);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--fire-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // ── 지형 생성 — 연료 지도. 2옥타브 값 노이즈로 "연료 많은 숲 / 적은 초원" 덩어리를 만든다 ──
  function valueNoiseGrid(): void {
    const COLS = colsRef.current;
    const ROWS = gridRef.current.rows;
    const coarse = new Float32Array(9 * 5);
    for (let c = 0; c < coarse.length; c++) coarse[c] = rand();
    const fine = new Float32Array(17 * 9);
    for (let f = 0; f < fine.length; f++) fine[f] = rand();
    const g = gridRef.current;
    const n = COLS * ROWS;
    g.fuel = new Float32Array(n);
    g.heat = new Float32Array(n);
    g.nheat = new Float32Array(n);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        // 굵은 노이즈 쌍선형 보간
        const gx = x / COLS * 8, gy = y / ROWS * 4;
        const x0 = Math.min(7, gx | 0), y0 = Math.min(3, gy | 0);
        const fx = gx - x0, fy = gy - y0;
        const c00 = coarse[y0 * 9 + x0], c10 = coarse[y0 * 9 + x0 + 1];
        const c01 = coarse[(y0 + 1) * 9 + x0], c11 = coarse[(y0 + 1) * 9 + x0 + 1];
        const v1 = c00 + (c10 - c00) * fx;
        const v2 = c01 + (c11 - c01) * fx;
        const coarseV = v1 + (v2 - v1) * fy;
        // 가는 노이즈(16×8)
        const gx2 = x / COLS * 16, gy2 = y / ROWS * 8;
        const x02 = Math.min(15, gx2 | 0), y02 = Math.min(7, gy2 | 0);
        const fx2 = gx2 - x02, fy2 = gy2 - y02;
        const f00 = fine[y02 * 17 + x02], f10 = fine[y02 * 17 + x02 + 1];
        const f01 = fine[(y02 + 1) * 17 + x02], f11 = fine[(y02 + 1) * 17 + x02 + 1];
        const w1 = f00 + (f10 - f00) * fx2;
        const w2 = f01 + (f11 - f01) * fx2;
        const fineV = w1 + (w2 - w1) * fy2;
        // 2옥타브 합성 + 하단 가중(아래쪽이 연료 진한 숲)
        const v = coarseV * 0.7 + fineV * 0.3 + (y / ROWS) * 0.28 + 0.12;
        g.fuel[y * COLS + x] = Math.max(0.08, Math.min(1, v));
      }
    }
  }

  // 점화 — 시드 고정 순서로 옮겨 다니는 불씨(리사주)
  function spark(k: number): void {
    const COLS = colsRef.current;
    const ROWS = gridRef.current.rows;
    const g = gridRef.current;
    const th = (k * SPARK_EVERY / 8.1 % 1) * Math.PI * 2;
    const gx = Math.round((0.5 + Math.sin(th) * 0.36) * (COLS - 1));
    const gy = Math.round((0.72 + Math.sin(th * 2 + 1.2) * 0.2) * (ROWS - 1));
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        g.heat[y * COLS + x] = 1.0;
      }
    }
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const size = sizeRef.current;
    const r = field.getBoundingClientRect();
    size.w = r.width; size.h = r.height;
    cv.width = Math.round(size.w); cv.height = Math.round(size.h);
    ctxRef.current = ctx;
    const COLS = colsRef.current;
    gridRef.current.rows = Math.max(24, Math.round(COLS * size.h / size.w));
    resetRand();                              // 지형이 창 크기와 무관하게 같은 시드에서
    valueNoiseGrid();
    frameNoRef.current = 0; sparkAtRef.current = 0;
    // 셀당 1픽셀 버퍼 — putImageData 로 올린 뒤 캔버스 크기로 확대
    const buf = document.createElement("canvas");
    buf.width = COLS; buf.height = gridRef.current.rows;
    bctxRef.current = buf.getContext("2d");
    imgRef.current = bctxRef.current ? bctxRef.current.createImageData(COLS, gridRef.current.rows) : null;
    bufRef.current = buf;
    setGrid(COLS + "×" + gridRef.current.rows);
  }

  // ── 시뮬 한 프레임 ──
  // 타는 칸(heat > IGNITE)의 연료가 닳고, 이웃 8칸으로 열을 넘긴다. 열은 프레임마다 식는다.
  function sim(): void {
    const COLS = colsRef.current;
    const g = gridRef.current;
    const ROWS = g.rows;
    for (let i = 0; i < g.heat.length; i++) {
      const f = g.fuel[i];
      if (g.heat[i] > IGNITE && f > 0) {
        // 연료 소모 — 남은 연료에 비례해 잘 탄다(연료가 많으면 열도 세다)
        const burn = Math.min(f, burnRateRef.current * (0.4 + f));
        g.fuel[i] = f - burn;
        const give = spreadRef.current * (0.3 + f * 0.7);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = (i % COLS) + dx, ny = ((i / COLS) | 0) + dy;
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
            // 대각선은 거리 1.41 배 — 열이 멀리는 덜 간다
            g.nheat[ny * COLS + nx] += give / (dx && dy ? 1.41 : 1);
          }
        }
        // 타는 동안 자기 열도 유지된다
        g.nheat[i] += give * 0.8;
      }
      // 냉각 — 열은 매 프레임 식는다
      g.nheat[i] += g.heat[i] * 0.72;
    }
    const t = g.heat; g.heat = g.nheat; g.nheat = t;
    g.nheat.fill(0);
  }

  // ── 렌더 — 셀당 픽셀 하나를 ImageData 에 직접 쓴다 ──
  function render(): void {
    const ctx = ctxRef.current, col = colRef.current, img = imgRef.current, bctx = bctxRef.current, buf = bufRef.current;
    if (!ctx || !col || !img || !bctx || !buf) return;
    const g = gridRef.current;
    const d = img.data;
    const frameNo = frameNoRef.current;
    for (let i = 0, j = 0; i < g.heat.length; i++, j += 4) {
      const f = g.fuel[i], h = g.heat[i];
      let r: number, gg: number, b: number;
      if (h > IGNITE && f > 0) {
        // 활성 화염 — heat 정규화 색온도(ember↔gold). 최고온 도트에 로즈
        const hh = Math.min(1, (h - IGNITE) / 0.9);
        if (hh > 0.72 && ((i * 7 + frameNo) & 15) === 0) {
          r = col.rose[0]; gg = col.rose[1]; b = col.rose[2];
        } else {
          r = col.ember[0] + (col.gold[0] - col.ember[0]) * hh;
          gg = col.ember[1] + (col.gold[1] - col.ember[1]) * hh;
          b = col.ember[2] + (col.gold[2] - col.ember[2]) * hh;
        }
      } else if (f <= 0) {
        // 소진된 칸 — 잉크보다 살짝 밝은 검댓. 남은 열만큼 식어 간다
        const cool = Math.max(0, h);
        r = col.ink[0] + (col.ember[0] - col.ink[0]) * cool * 0.5;
        gg = col.ink[1] + (col.ember[1] - col.ink[1]) * cool * 0.5;
        b = col.ink[2] + (col.ember[2] - col.ink[2]) * cool * 0.5;
      } else {
        // 미연 연료 지형 — 연료량이 smoke 톤 명암
        const shade = 0.06 + f * 0.16;
        r = col.ink[0] + (col.smoke[0] - col.ink[0]) * shade;
        gg = col.ink[1] + (col.smoke[1] - col.ink[1]) * shade;
        b = col.ink[2] + (col.smoke[2] - col.ink[2]) * shade;
      }
      d[j] = r | 0; d[j + 1] = gg | 0; d[j + 2] = b | 0; d[j + 3] = 255;
    }
    bctx.putImageData(img, 0, 0);
    // 셀 1픽셀 버퍼를 캔버스 CSS 크기로 확대 — 매끈한 셀 블록
    const { w: W, h: H } = sizeRef.current;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0, W, H);
  }

  // 다 탄 칸 수(소화전) — 진행 라벨. 값이 바뀔 때만 setState 한다
  function reportBurnt(): void {
    const g = gridRef.current;
    let n = 0;
    for (let i = 0; i < g.fuel.length; i++) if (g.fuel[i] <= 0) n++;
    setFires((prev) => (prev === n ? prev : n));
  }

  function frame(): void {
    frameNoRef.current++;
    const f = frameNoRef.current;
    if (f % SPARK_EVERY === 1 && f < SPARK_EVERY * 14) {
      spark(sparkAtRef.current++);
    }
    sim();
    render();
    reportBurnt();
    rafRef.current = requestAnimationFrame(frame);
  }

  // 키보드 보조 — 엔터로 불씨 하나 추가(자동 점화와 같은 규칙, 무작위 셀)
  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const COLS = colsRef.current;
    const g = gridRef.current;
    const gx = 1 + Math.floor(rand() * (COLS - 2));
    const gy = 1 + Math.floor(rand() * (g.rows - 2));
    g.heat[gy * COLS + gx] = 1.0;
    if (reduced()) { sim(); render(); reportBurnt(); }
  }

  // 정지판 — 시뮬을 몰아 전진해 화재가 한창 번진 한 장을 담는다
  function stillFrame(): void {
    spark(0); spark(1);
    for (let s = 0; s < 40; s++) sim();
    render();
    reportBurnt();
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    colsRef.current = cols;
    spreadRef.current = spread;
    burnRateRef.current = burnRate;
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    fit();
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 번진 한 장
      stillFrame();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, spread, burnRate]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 144a80 80 0 0 1-160 0c0-30.57 14.42-58.26 31-80l33 32l26.27-72C159.86 41.92 208 88.15 208 144" opacity=".2"/><path d="M183.89 153.34a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68ZM216 144a88 88 0 0 1-176 0c0-27.92 11-56.47 32.66-84.85a8 8 0 0 1 11.93-.89l24.12 23.41l22-60.41a8 8 0 0 1 12.63-3.41C165.21 36 216 84.55 216 144m-16 0c0-46.09-35.79-85.92-58.21-106.33l-22.27 61.07a8 8 0 0 1-13.09 3L80.06 76.16C64.09 99.21 56 122 56 144a72 72 0 0 0 144 0"/></g></svg>
          <span>각 칸이 연료를 품고, 타는 칸이 이웃에 열을 넘기며 연료가 닳습니다 — 다 탄 자리는 꺼집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">
            <span className={styles.badgeNum}>{grid}</span>
            <span className={styles.badgeUnit}>연료 격자</span>
          </b>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{fires}</b>개 소화전 · 연료 총량 100%</span>
          <span className={styles.metaDim}>ImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
