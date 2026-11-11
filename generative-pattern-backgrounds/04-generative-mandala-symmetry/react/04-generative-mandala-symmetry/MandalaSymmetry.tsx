// MandalaSymmetry — vanilla 판(run/293/demo/04-generative-mandala-symmetry/index.html) 의 React 포트.
// 난수는 "획 하나"에만 쓰고 나머지 열한 개는 그 획을 30도씩 돌린 복사본이다. 획 생성은 JS, 연출은 CSS.
// 시드·겹 수·팔 수·획의 반지름 비율은 vanilla 와 같은 값이다.
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MandalaSymmetry.module.scss";

export type MandalaSymmetryProps = {
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
type Ring = { i: number; tone: string; d: string };

const CX = 120;
const CY = 75;
const ARMS = 12;
const RINGS = 3;

// 팔의 각도는 시드와 무관한 상수다 — 30도씩 열두 번
const ANGLES: number[] = [];
for (let arm = 0; arm < ARMS; arm++) { ANGLES.push(arm * 360 / ARMS); }

// mulberry32 — 32비트 정수 시드 하나로 언제나 같은 난수열을 돌려준다. 재현 가능한 생성의 뿌리
function mulberry32(a: number): () => number {
  return function (): number {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 중심에서 위로 뻗는 획 하나. 이 획 하나만 난수로 정하고 나머지는 전부 이것을 돌려 쓴다
function stroke(rand: () => number, reach: number): string {
  const r1 = reach * (0.3 + rand() * 0.14);
  const r2 = reach * (0.62 + rand() * 0.16);
  const r3 = reach;
  const w1 = 4 + rand() * 12;
  const w2 = 2 + rand() * 14;
  return "M0 0C" + w1.toFixed(1) + " " + (-r1).toFixed(1) + " " + w2.toFixed(1) + " " + (-r2).toFixed(1) +
         " 0 " + (-r3).toFixed(1) + "C" + (-w2).toFixed(1) + " " + (-r2).toFixed(1) + " " +
         (-w1).toFixed(1) + " " + (-r1).toFixed(1) + " 0 0Z";
}

export default function MandalaSymmetry({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
  label = "A symmetric figure made by turning one stroke twelve times, seed {n}",
  seedText = "Seed",
  regenerateText = "Regenerate",
  copyText = "Copy SVG",
  copiedText = "Copied",
}: MandalaSymmetryProps) {
  const artRef = useRef<SVGSVGElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [mode, setMode] = useState("demo");
  const [copyLabel, setCopyLabel] = useState(copyText);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 시드가 바뀔 때만 다시 계산한다 — 겹마다 난수를 이어서 쓰므로 겹 순서가 곧 난수 소비 순서다
  const rings = useMemo(() => {
    const rand = mulberry32(seed);
    const out: Ring[] = [];
    for (let ring = 0; ring < RINGS; ring++) {
      out.push({ i: ring, tone: ring % 2 ? "ringB" : "ringA", d: stroke(rand, 62 - ring * 17) });
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

  const rootClass = `${styles.md} ${mode === "demo" ? styles.isDemo : styles.isDraw}`;

  return (
    <div className={rootClass} style={vars}>
      <svg
        ref={artRef}
        className={styles.art}
        viewBox="0 0 240 150"
        role="img"
        aria-label={label.replace("{n}", String(seed))}
      >
        {rings.map((r: Ring) => (
          <g
            key={r.i}
            className={`${styles.ring} ${styles[r.tone]}`}
            style={{ "--i": r.i } as CSSProperties}
          >
            {ANGLES.map((deg: number, k: number) => (
              <path key={k} transform={`translate(${CX} ${CY}) rotate(${deg})`} d={r.d} />
            ))}
          </g>
        ))}
        <circle className={styles.eye} cx={CX} cy={CY} r={6} />
      </svg>
      <div className={styles.bar}>
        <p className={styles.seed}>{seedText} <b>{seed}</b></p>
        <button className={styles.btn} type="button" onClick={regenerate}>{regenerateText}</button>
        <button className={styles.btn} type="button" onClick={copySvg}>{copyLabel}</button>
      </div>
    </div>
  );
}
