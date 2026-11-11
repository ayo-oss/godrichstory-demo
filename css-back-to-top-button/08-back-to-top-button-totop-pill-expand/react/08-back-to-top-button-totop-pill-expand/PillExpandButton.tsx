import type { CSSProperties } from "react";
import styles from "./PillExpandButton.module.scss";

export type PillExpandButtonProps = {
  label?: string;
  /** 폭이 넓어지는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

// 실제 사용: 마우스를 올리거나 포커스하면 폭이 넓어져 라벨이 드러난다. 상태 없이 CSS 로 처리한다
export default function PillExpandButton({
  label = "맨 위로",
  duration = 220,
  easing = "ease-out",
}: PillExpandButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label={label}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
