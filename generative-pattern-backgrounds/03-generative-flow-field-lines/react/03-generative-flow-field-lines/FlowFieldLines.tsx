// FlowFieldLines — vanilla 판(run/293/demo/03-generative-flow-field-lines/index.html) 의 React 포트.
// 자리마다 각도를 하나씩 정해 둔 방향장 위를 짧은 걸음으로 걸어 곡선을 만든다. 경로는 JS, 그리는 연출은 CSS.
// 시드·격자 수·걸음 수·걸음 길이는 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FlowFieldLines.module.scss";

export type FlowFieldLinesProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
  seedText?: string;
  regenerateText?: string;
  copyText?: string;
  copiedText?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type Line = { key: number; tone: string; i: number; d: string };

const W = 240;
const H = 150;
const COLS = 5;
const ROWS = 3;
const GX = 9;
const GY = 6;
const STEPS = 30;
const STEP = 4.4;

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 성긴 격자에 난수를 놓고 사이를 smoothstep 으로 이어 자리마다 하나의 각도를 준다 = 방향장
function makeAngles(s: number): (x: number, y: number) => number {
  const rand = mulberry32(s);
  const lat: number[][] = [];
  for (let r = 0; r <= ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c <= COLS; c++) { row.push(rand()); }
    lat.push(row);
  }
  return function (x: number, y: number): number {
    const gx = Math.max(0, Math.min(COLS - 0.001, x / W * COLS));
    const gy = Math.max(0, Math.min(ROWS - 0.001, y / H * ROWS));
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lat[iy][ix] + (lat[iy][ix + 1] - lat[iy][ix]) * sx;
    const bot = lat[iy + 1][ix] + (lat[iy + 1][ix + 1] - lat[iy + 1][ix]) * sx;
    return (top + (bot - top) * sy) * Math.PI * 3;
  };
}

// 한 점에서 시작해 그 자리의 각도로 한 걸음씩 옮기며 좌표를 이어 붙인다
function walk(angleAt: (x: number, y: number) => number, x: number, y: number): string {
  let d = "M" + x.toFixed(1) + " " + y.toFixed(1);
  for (let i = 0; i < STEPS; i++) {
    const a = angleAt(x, y);
    x += Math.cos(a) * STEP;
    y += Math.sin(a) * STEP;
    if (x < -8 || x > W + 8 || y < -8 || y > H + 8) { break; }
    d += "L" + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}

export default function FlowFieldLines({
  duration = 2000,
  easing = "cubic-bezier(.7, 0, .85, .4)",
  color = "#fff7e6",
  label = "A picture drawn with lines flowing along a field of angles, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: FlowFieldLinesProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 경로 문자열이 나온다.
  // 시작점은 흔들린 격자에서 뽑아 화면 전체에 고르게 깔리게 한다 (순수 난수면 한쪽에 뭉친다)
  const lines = useMemo(() => {
    const angleAt = makeAngles(seed);
    const rand = mulberry32(seed + 991);
    const out: Line[] = [];
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const x = (gx + 0.15 + rand() * 0.7) / GX * W;
        const y = (gy + 0.15 + rand() * 0.7) / GY * H;
        const tone = rand() < 0.34 ? "lineB" : "lineA";
        out.push({ key: gy * GX + gx, tone, i: (gx + gy) % 11, d: walk(angleAt, x, y) });
      }
    }
    return out;
  }, [seed]);

  function regenerate(): void {
    setSeed((prev: number) => (prev * 7 + 13) % 991 + 1);
    setMode("draw");
  }

  function copySvg(): void {
    const art = artRef.current;
    if (!art) { return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(art.outerHTML).catch(function () {});
    }
    setCopyLabel(copiedText);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopyLabel(copyText), 1200);
  }

  const rootClass = `${styles.ff} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {lines.map((l: Line) => (
          <path
            key={l.key}
            className={`${styles.line} ${styles[l.tone]}`}
            style={{ "--i": l.i } as CSSProperties}
            pathLength={1}
            d={l.d}
          />
        ))}
      </svg>
      <div className={styles.bar}>
        <p className={styles.seed}>{seedText} <b>{seed}</b></p>
        <button className={styles.btn} type="button" onClick={regenerate}>{regenerateText}</button>
        <button className={styles.btn} type="button" onClick={copySvg}>{copyLabel}</button>
      </div>
    </div>
  );
}
