// RecursiveSplit — vanilla 판(run/293/demo/07-generative-recursive-split/index.html) 의 React 포트.
// 자르는 규칙 하나가 자기 자신을 부르며 깊이를 줄인다. 난수는 자르는 방향과 자르는 자리에만 쓴다.
// 시드·깊이(5)·최소 변(22)·확률(0.82 / 0.18)·자리(0.32 + 0.36)는 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecursiveSplit.module.scss";

export type RecursiveSplitProps = {
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

type Rect = { x: number; y: number; w: number; h: number };
type Piece = Rect & { tone: string };

const W = 240;
const H = 150;
const DEPTH = 5;
const MIN = 22;

// vanilla 의 TONES = ['a','a','b','c','d'] 와 같다 — 'a' 가 두 번이라 크림색이 더 자주 나온다
const TONES: string[] = ["toneA", "toneA", "toneB", "toneC", "toneD"];

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 자기 자신을 두 번 부르며 깊이를 하나씩 줄인다. 더 못 자를 만큼 작아지면 그 조각을 결과에 넣는다
function split(x: number, y: number, w: number, h: number, depth: number, rand: () => number, out: Rect[]): void {
  if (depth === 0 || (w < MIN * 2 && h < MIN * 2)) { out.push({ x: x, y: y, w: w, h: h }); return; }
  const cutDown = w > h ? rand() < 0.82 : rand() < 0.18;   // 긴 쪽을 자르는 쪽으로 기울인다
  const t = 0.32 + rand() * 0.36;
  if (cutDown) {
    split(x, y, w * t, h, depth - 1, rand, out);
    split(x + w * t, y, w * (1 - t), h, depth - 1, rand, out);
  } else {
    split(x, y, w, h * t, depth - 1, rand, out);
    split(x, y + h * t, w, h * (1 - t), depth - 1, rand, out);
  }
}

// 색은 조각을 다 자른 뒤에 고른다 — 난수를 부르는 차례가 vanilla 와 같아야 같은 그림이 나온다
function build(s: number): Piece[] {
  const rand = mulberry32(s);
  const boxes: Rect[] = [];
  split(0, 0, W, H, DEPTH, rand, boxes);
  const out: Piece[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    out.push({ x: b.x, y: b.y, w: b.w, h: b.h, tone: TONES[Math.floor(rand() * TONES.length)] });
  }
  return out;
}

export default function RecursiveSplit({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  label = "A composition built by cutting one big rectangle over and over, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: RecursiveSplitProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 구성이 나온다
  const pieces = useMemo(() => build(seed), [seed]);

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

  const rootClass = `${styles.rs} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {/* 자리는 x·y 속성이 잡고 CSS 는 transform 만 건드린다 — 둘이 겹치지 않아 조각이 제자리를 지킨다 */}
        {pieces.map((p: Piece, i: number) => (
          <rect
            key={i}
            className={`${styles.box} ${styles[p.tone]}`}
            style={{ "--i": i } as CSSProperties}
            x={p.x.toFixed(1)}
            y={p.y.toFixed(1)}
            width={p.w.toFixed(1)}
            height={p.h.toFixed(1)}
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
