import type { CSSProperties, ReactNode } from "react";
import styles from "./FocusTooltip.module.scss";

export type FocusTooltipProps = {
  label: ReactNode;
  text: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// :hover 와 :focus-visible 을 CSS 에서 같이 걸어 뒀다 — Tab 으로 옮겨도 마우스 호버와 같은 툴팁이 뜬다.
export default function FocusTooltip({
  label,
  text,
  duration = 200,
  easing = "ease-out",
  color = "#fff7e6",
}: FocusTooltipProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <button type="button" className={styles.btn} aria-describedby="focus-tooltip">
        {label}
      </button>
      <span id="focus-tooltip" role="tooltip" className={styles.tooltip}>
        {text}
      </span>
    </span>
  );
}
