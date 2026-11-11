// TruchetTiles — vanilla 판(run/293/demo/05-generative-truchet-tiles/index.html) 의 React 포트.
// 타일은 한 장뿐이고 난수가 정하는 것은 각도(0·90·180·270)와 색 두 가지밖에 없다.
// 시드·격자 수·확률(0.28)은 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TruchetTiles.module.scss";

export type TruchetTilesProps = {
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

type Tile = { x: number; y: number; turn: number; toned: boolean; i: number };

const SIZE = 24;
const COLS = 10;
const ROWS = 6;
const W = SIZE * COLS;
const H = SIZE * ROWS;

// 타일 한 장 = 이웃한 두 변의 한가운데를 잇는 사분원 두 개. 이것만 있으면 된다
// (왼쪽 변 중점 → 위쪽 변 중점, 오른쪽 변 중점 → 아래쪽 변 중점. 마주 보는 변끼리면 사분원이 안 된다)
const TILE = "M0 12A12 12 0 0 1 12 0M24 12A12 12 0 0 0 12 24";

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 난수를 부르는 차례(각도 → 색)가 vanilla 와 같아야 같은 시드에서 같은 미로가 나온다
function build(s: number): Tile[] {
  const rand = mulberry32(s);
  const out: Tile[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const turn = Math.floor(rand() * 4) * 90;
      const toned = rand() < 0.28;
      out.push({ x: col * SIZE, y: row * SIZE, turn: turn, toned: toned, i: col + row });
    }
  }
  return out;
}

export default function TruchetTiles({
  duration = 2000,
  easing = "steps(1, end)",
  color = "#17141a",
  label = "A maze of curves from one tile laid at random angles, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: TruchetTilesProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 타일 배열이 나온다
  const tiles = useMemo(() => build(seed), [seed]);

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

  const rootClass = `${styles.tr} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {/* 바깥 g 는 자리만 잡는다(정적). 애니메이션이 붙는 안쪽 g 에 CSS transform 을 쓰면
            transform 속성이 덮여 타일이 제자리를 잃기 때문이다 */}
        {tiles.map((t: Tile, k: number) => (
          <g key={k} transform={`translate(${t.x} ${t.y})`}>
            <g
              className={`${styles.tile} ${t.toned ? styles.toneB : styles.toneA}`}
              style={{ "--i": t.i } as CSSProperties}
            >
              <path transform={`rotate(${t.turn} 12 12)`} d={TILE} />
            </g>
          </g>
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
