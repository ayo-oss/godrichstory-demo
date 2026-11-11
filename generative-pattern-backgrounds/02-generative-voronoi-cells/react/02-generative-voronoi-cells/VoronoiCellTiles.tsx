// VoronoiCellTiles — vanilla 판(run/293/demo/02-generative-voronoi-cells/index.html) 의 React 포트.
// 흩뿌린 점마다 바깥 사각형을 "다른 점과의 수직이등분선" 으로 계속 잘라, 남은 조각이 그 점의 셀이다.
// 면 생성은 JS, 연출은 CSS. 시드·점 개수·자르는 순서는 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./VoronoiCellTiles.module.scss";

export type VoronoiCellTilesProps = {
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
type Point = [number, number];
type Cell = { i: number; tone: string; points: string };

const W = 240;
const H = 150;
const SITES = 26;

// 네 가지 칠. 뽑는 순서와 확률은 vanilla 의 'a' 'b' 'c' 'd' 와 같고 이름만 CSS 모듈식이다
const TONES: string[] = ["cellA", "cellB", "cellC", "cellD"];

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 두 점의 수직이등분선으로 다각형을 잘라 a 쪽 반평면만 남긴다 (서덜랜드-호지먼 클리핑)
function clip(poly: Point[], a: Point, b: Point): Point[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const out: Point[] = [];
  function side(p: Point): number { return (p[0] - mx) * dx + (p[1] - my) * dy; }
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) { out.push(p); }
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

export default function VoronoiCellTiles({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  label = "Cell tiles where each scattered point owns its nearest area, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: VoronoiCellTilesProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 같은 시드면 언제나 같은 셀이 나온다.
  // 칠(tone)을 뽑는 rand() 는 셀이 살아남은 뒤에만 부른다: vanilla 와 난수 소비 순서를 맞춰야
  // 같은 시드에서 두 판의 색이 어긋나지 않는다
  const cells = useMemo(() => {
    const rand = mulberry32(seed);
    const pts: Point[] = [];
    const out: Cell[] = [];
    for (let i = 0; i < SITES; i++) { pts.push([10 + rand() * (W - 20), 8 + rand() * (H - 16)]); }
    for (let i = 0; i < SITES; i++) {
      let poly: Point[] = [[0, 0], [W, 0], [W, H], [0, H]];
      for (let j = 0; j < SITES && poly.length > 0; j++) { if (j !== i) { poly = clip(poly, pts[i], pts[j]); } }
      if (poly.length < 3) { continue; }
      const tone = TONES[Math.min(3, Math.floor(rand() * 4))];
      const d = poly.map((p: Point) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      out.push({ i, tone, points: d });
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

  const rootClass = `${styles.vo} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {cells.map((c: Cell) => (
          <polygon
            key={c.i}
            className={`${styles.cell} ${styles[c.tone]}`}
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
