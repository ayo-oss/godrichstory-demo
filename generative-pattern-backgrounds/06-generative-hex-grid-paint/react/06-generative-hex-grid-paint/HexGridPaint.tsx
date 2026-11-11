// HexGridPaint — vanilla 판(run/293/demo/06-generative-hex-grid-paint/index.html) 의 React 포트.
// 벌집처럼 깔린 육각형을 「자리(왼쪽→오른쪽으로 기운 확률) + 난수」로 칠한다. 자리가 결과에 남는다.
// 시드·반지름·격자 수·기울기(1.6 / 2.4)는 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HexGridPaint.module.scss";

export type HexGridPaintProps = {
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

type Cell = { points: string; tone: number; i: number };

const W = 240;
const H = 150;
const R = 15;
const COLS = 11;
const ROWS = 7;
const HSTEP = R * 1.5;
const VSTEP = R * Math.sqrt(3);

// 색 단계 네 가지 — vanilla 의 TONES = ['a','b','c','d'] 와 차례가 같다
const TONES: string[] = ["toneA", "toneB", "toneC", "toneD"];

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 납작한 육각형 여섯 꼭짓점 — 0도부터 60도씩
function hexPoints(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    pts.push((cx + R * Math.cos(a)).toFixed(1) + "," + (cy + R * Math.sin(a)).toFixed(1));
  }
  return pts.join(" ");
}

function build(s: number): Cell[] {
  const rand = mulberry32(s);
  const out: Cell[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cx = col * HSTEP;
      const cy = row * VSTEP + (col % 2 ? VSTEP / 2 : 0) - VSTEP / 2;
      // 색 단계는 왼쪽에서 오른쪽으로 기운 확률에 난수를 섞어 고른다 — 자리가 결과에 남는다
      const bias = col / (COLS - 1) * 1.6 + rand() * 2.4;
      const tone = Math.max(0, Math.min(3, Math.floor(bias)));
      out.push({ points: hexPoints(cx, cy), tone: tone, i: col + row });
    }
  }
  return out;
}

export default function HexGridPaint({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
  label = "A honeycomb grid colored by position and a random draw, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: HexGridPaintProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 격자가 나온다
  const cells = useMemo(() => build(seed), [seed]);

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

  const rootClass = `${styles.hx} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {cells.map((c: Cell, k: number) => (
          <polygon
            key={k}
            className={`${styles.cell} ${styles[TONES[c.tone]]}`}
            style={{ "--i": c.i } as CSSProperties}
            points={c.points}
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
