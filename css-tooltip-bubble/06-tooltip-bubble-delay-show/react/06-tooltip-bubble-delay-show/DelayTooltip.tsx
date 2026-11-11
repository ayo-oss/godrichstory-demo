import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./DelayTooltip.module.scss";

export type DelayTooltipProps = {
  label: ReactNode;
  text: string;
  /** 호버 후 뜨기까지 기다리는 시간 (기본 400ms) */
  delay?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DelayTooltip({
  label,
  text,
  delay = 400,
  duration = 160,
  easing = "ease-out",
  color = "#17141a",
}: DelayTooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const start = () => {
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span className={styles.wrap} style={vars}>
      <button
        type="button"
        className={styles.btn}
        aria-describedby="delay-tooltip"
        onMouseEnter={start}
        onMouseLeave={cancel}
        onFocus={start}
        onBlur={cancel}
      >
        {label}
      </button>
      <span id="delay-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
