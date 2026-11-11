import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GridToSingleViewMorph.module.scss";

export type GridToSingleViewMorphProps = {
  /** 모프 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 선택 강조 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TONES = ["a", "b", "c", "d", "e", "f"] as const;
// 칸마다 고정 위치라 "격자 전체 크기로 커질 때" 이동량도 고정값 — 3열×2행 격자에서 계산
const OFFSETS = [
  "translate(64px, 32px) scale(3.29, 2.14)",
  "translate(0, 32px) scale(3.29, 2.14)",
  "translate(-64px, 32px) scale(3.29, 2.14)",
  "translate(64px, -32px) scale(3.29, 2.14)",
  "translate(0, -32px) scale(3.29, 2.14)",
  "translate(-64px, -32px) scale(3.29, 2.14)",
];

/** 칸을 클릭하면 모달 없이 그리드 자체가 재배치되어 그 칸이 자리에서 커진다. 다시 클릭하면 되돌아간다 */
export default function GridToSingleViewMorph({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#6ec8ff",
}: GridToSingleViewMorphProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={styles.grid} style={vars} role="radiogroup" aria-label="Pick a photo to view large">
      {TONES.map((tone, i) => {
        const isSelected = selected === i;
        const dim = selected !== null && !isSelected;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`View photo ${i + 1} large`}
            className={`${styles.tile} ${dim ? styles.dim : ""} ${isSelected ? styles.selected : ""}`}
            style={isSelected ? { transform: OFFSETS[i] } : undefined}
            onClick={() => setSelected(isSelected ? null : i)}
          >
            <span className={`${styles.img} ${styles["img-" + tone]}`} />
          </button>
        );
      })}
    </div>
  );
}
