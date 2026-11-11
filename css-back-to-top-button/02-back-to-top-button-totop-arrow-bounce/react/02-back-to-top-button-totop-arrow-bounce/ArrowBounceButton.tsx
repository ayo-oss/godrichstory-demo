import type { CSSProperties } from "react";
import styles from "./ArrowBounceButton.module.scss";

export type ArrowBounceButtonProps = {
  /** 한 번 튕기는 데 걸리는 시간 (기본 1.4s) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ArrowBounceButton({
  duration = 1400,
  easing = "ease-out",
  color = "#ffd23f",
}: ArrowBounceButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,14 12,7 19,14" />
        <polyline points="5,19 12,12 19,19" />
      </svg>
    </button>
  );
}
