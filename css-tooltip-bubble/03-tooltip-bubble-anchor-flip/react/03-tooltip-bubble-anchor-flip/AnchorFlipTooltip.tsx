import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AnchorFlipTooltip.module.scss";

export type AnchorFlipTooltipProps = {
  label: ReactNode;
  text: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// anchor-name/position-anchor 는 Chrome 125+ 에서만 동작한다. 미지원 브라우저는
// .module.scss 의 기본 position:absolute 규칙이 버튼 아래에 그대로 띄운다.
export default function AnchorFlipTooltip({
  label,
  text,
  duration = 200,
  easing = "ease-out",
  color = "#fff7e6",
}: AnchorFlipTooltipProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <span className={styles.wrap} style={vars}>
      <button
        type="button"
        className={styles.trigger}
        aria-describedby="anchor-tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>
      <span id="anchor-tooltip" role="tooltip" className={styles.tooltip} data-open={open}>
        {text}
      </span>
    </span>
  );
}
