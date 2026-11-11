// NoiseContourMap — vanilla 판(run/293/demo/01-generative-noise-contour/index.html) 의 React 포트.
// 값 노이즈로 높이를 만들고 마칭 스퀘어로 같은 높이를 잇는 선을 뽑는다. 경로는 JS, 그리는 연출은 CSS.
// 시드·격자 수·문턱은 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NoiseContourMap.module.scss";

export type NoiseContourMapProps = {
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

const W = 240;
const H = 150;
const COLS = 9;
const ROWS = 6;
const LEVELS = 6;
const NX = 32;
const NY = 20;

// 칸 네 꼭짓점의 높이를 문턱과 견줘 어느 변에서 선이 드나드는지 고른다 (마칭 스퀘어 16가지)
const TABLE: number[][][] = [[], [[2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3], [1, 2]], [[0, 2]], [[0, 3]],
  [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]], []];

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 격자 꼭짓점에만 난수를 놓고 사이는 smoothstep 으로 이어 붙인다 (값 노이즈)
function makeField(s: number): (x: number, y: number) => number {
  const rand = mulberry32(s);
  const lat: number[][] = [];
  for (let r = 0; r <= ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c <= COLS; c++) { row.push(rand()); }
    lat.push(row);
  }
  return function (x: number, y: number): number {
    const gx = x * COLS;
    const gy = y * ROWS;
    const ix = Math.min(COLS - 1, Math.floor(gx));
    const iy = Math.min(ROWS - 1, Math.floor(gy));
    const fx = gx - ix;
    const fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lat[iy][ix] + (lat[iy][ix + 1] - lat[iy][ix]) * sx;
    const bot = lat[iy + 1][ix] + (lat[iy + 1][ix + 1] - lat[iy + 1][ix]) * sx;
    return top + (bot - top) * sy;
  };
}

function cut(ax: number, ay: number, av: number, bx: number, by: number, bv: number, level: number): string {
  const t = (level - av) / (bv - av);
  return ((ax + (bx - ax) * t) * W).toFixed(1) + " " + ((ay + (by - ay) * t) * H).toFixed(1);
}

function contour(field: (x: number, y: number) => number, level: number): string {
  let d = "";
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const x0 = i / NX, y0 = j / NY, x1 = (i + 1) / NX, y1 = (j + 1) / NY;
      const v = [field(x0, y0), field(x1, y0), field(x1, y1), field(x0, y1)];
      const code = (v[0] > level ? 8 : 0) | (v[1] > level ? 4 : 0) | (v[2] > level ? 2 : 0) | (v[3] > level ? 1 : 0);
      const pairs = TABLE[code];
      if (!pairs.length) { continue; }
      const edge = [cut(x0, y0, v[0], x1, y0, v[1], level), cut(x1, y0, v[1], x1, y1, v[2], level),
        cut(x1, y1, v[2], x0, y1, v[3], level), cut(x0, y1, v[3], x0, y0, v[0], level)];
      for (let k = 0; k < pairs.length; k++) { d += "M" + edge[pairs[k][0]] + "L" + edge[pairs[k][1]]; }
    }
  }
  return d;
}

export default function NoiseContourMap({
  duration = 2000,
  easing = "cubic-bezier(.7, 0, .85, .4)",
  color = "#fff7e6",
  label = "A map of random heights drawn as contour lines, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: NoiseContourMapProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 경로 문자열이 나온다
  const paths = useMemo(() => {
    const field = makeField(seed);
    const out: string[] = [];
    for (let i = 0; i < LEVELS; i++) { out.push(contour(field, 0.26 + i * 0.1)); }
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

  const rootClass = `${styles.nc} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {paths.map((d: string, i: number) => (
          <path key={i} className={styles.line} style={{ "--i": i } as CSSProperties} pathLength={1} d={d} />
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
