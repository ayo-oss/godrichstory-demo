import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PulseDotTooltip.module.scss";

export type PulseDotTooltipProps = {
  label: ReactNode;
  text: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PulseDotTooltip({
  label,
  text,
  duration = 200,
  easing = "ease-out",
  color = "#2f6df6",
}: PulseDotTooltipProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <span
        className={styles.badge}
        tabIndex={0}
        aria-describedby="pulse-tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
        <i className={styles.dot} aria-hidden="true" />
      </span>
      <span id="pulse-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
