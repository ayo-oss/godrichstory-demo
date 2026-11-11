import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ArrowTooltip.module.scss";

export type ArrowTooltipProps = {
  text: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ArrowTooltip({
  text,
  duration = 200,
  easing = "ease-out",
  color = "#fff7e6",
}: ArrowTooltipProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <span
        className={styles.icon}
        tabIndex={0}
        aria-describedby="arrow-tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </span>
      <span id="arrow-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
