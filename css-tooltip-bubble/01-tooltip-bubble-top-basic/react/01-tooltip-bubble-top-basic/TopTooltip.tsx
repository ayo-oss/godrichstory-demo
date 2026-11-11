import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./TopTooltip.module.scss";

export type TopTooltipProps = {
  /** 버튼 글자 */
  label: ReactNode;
  /** 툴팁 글자 */
  text: string;
  /** 나타나고 사라지는 시간 (기본 200ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 버튼 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TopTooltip({
  label,
  text,
  duration = 200,
  easing = "ease-out",
  color = "#2f6df6",
}: TopTooltipProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <button
        type="button"
        className={styles.btn}
        aria-describedby="top-tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>
      <span id="top-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
