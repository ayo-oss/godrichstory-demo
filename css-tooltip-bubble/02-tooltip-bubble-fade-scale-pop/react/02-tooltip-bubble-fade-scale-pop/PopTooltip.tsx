import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PopTooltip.module.scss";

export type PopTooltipProps = {
  label: ReactNode;
  text: string;
  /** 팝 애니메이션 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PopTooltip({
  label,
  text,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: PopTooltipProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <button
        type="button"
        className={styles.btn}
        aria-describedby="pop-tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>
      <span id="pop-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
