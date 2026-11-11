// BranchingTree — vanilla 판(run/293/demo/08-generative-branching-tree/index.html) 의 React 포트.
// 가지 하나를 그린 뒤 그 끝에서 자기 자신을 두 번 부른다. 난수는 벌어지는 각도와 줄어드는 비율에만 쓴다.
// 시드·깊이·뿌리 길이·굵기는 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BranchingTree.module.scss";

export type BranchingTreeProps = {
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

// 가지 하나와 그 끝에서 갈라진 자식들. 자식을 배열로 품기 때문에 JSX 도 같은 모양으로 중첩된다
type Branch = { x: number; y: number; x2: number; y2: number; width: number; gen: number; kids: Branch[] };

const DEPTH = 5;
const ROOT_LEN = 40;
const ROOT_WIDTH = 6.6;

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 난수를 부르는 순서가 곧 무늬다. 벌어지는 각도 → 왼쪽 가지(그 안의 재귀까지) → 오른쪽 가지 순서로
// vanilla 와 똑같이 부른다. 한 번만 어긋나도 같은 시드에서 다른 나무가 나온다
function grow(x: number, y: number, angle: number, len: number, width: number, depth: number, rand: () => number): Branch {
  const x2 = x + Math.cos(angle) * len;
  const y2 = y + Math.sin(angle) * len;
  const gen = DEPTH - depth;
  const kids: Branch[] = [];
  if (depth > 0) {
    const spread = 0.3 + rand() * 0.34;
    kids.push(grow(x2, y2, angle - spread, len * (0.7 + rand() * 0.12), width * 0.72, depth - 1, rand));
    kids.push(grow(x2, y2, angle + spread, len * (0.7 + rand() * 0.12), width * 0.72, depth - 1, rand));
  }
  return { x: x, y: y, x2: x2, y2: y2, width: width, gen: gen, kids: kids };
}

// 자식을 **부모 그룹 안에** 넣는다. 형제로 늘어놓으면 부모가 아직 덜 자란 사이에 자식만 제자리에
// 떠서 나무가 끊어져 보인다 (vanilla 실측: 접히는 구간의 poster 에 줄기 없이 잔가지만 남았다).
// 겹쳐 두면 부모의 배율이 자식까지 함께 끌고 간다
function renderBranch(b: Branch, key: string) {
  // --ox/--oy 는 그 가지의 뿌리 좌표다. CSS 가 이 점을 transform-origin 으로 받아 거기서 자라게 한다
  const vars = { "--i": b.gen, "--ox": `${b.x.toFixed(1)}px`, "--oy": `${b.y.toFixed(1)}px` } as CSSProperties;
  return (
    <g key={key} className={styles.seg} style={vars}>
      <line
        className={`${styles.line} ${b.gen > 3 ? styles.lineB : styles.lineA}`}
        x1={b.x.toFixed(1)}
        y1={b.y.toFixed(1)}
        x2={b.x2.toFixed(1)}
        y2={b.y2.toFixed(1)}
        strokeWidth={b.width.toFixed(2)}
      />
      {b.kids.map((kid: Branch, i: number) => renderBranch(kid, `${key}-${i}`))}
    </g>
  );
}

export default function BranchingTree({
  duration = 2000,
  easing = "cubic-bezier(.7, 0, .85, .4)",
  color = "#fff7e6",
  label = "A tree grown by splitting each branch in two, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: BranchingTreeProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 나무가 나온다
  const tree = useMemo(() => grow(120, 148, -Math.PI / 2, ROOT_LEN, ROOT_WIDTH, DEPTH, mulberry32(seed)), [seed]);

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

  const rootClass = `${styles.bt} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox="0 0 240 150"
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {renderBranch(tree, "r")}
      </svg>
      <div className={styles.bar}>
        <p className={styles.seed}>{seedText} <b>{seed}</b></p>
        <button className={styles.btn} type="button" onClick={regenerate}>{regenerateText}</button>
        <button className={styles.btn} type="button" onClick={copySvg}>{copyLabel}</button>
      </div>
    </div>
  );
}
