import { useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./CardPreviewTooltip.module.scss";

export type CardPreviewTooltipProps = {
  label: string;
  title: string;
  desc: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PopoverEl = HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void };

export default function CardPreviewTooltip({
  label,
  title,
  desc,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CardPreviewTooltipProps) {
  const cardRef = useRef<PopoverEl | null>(null);
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const show = () => {
    setOpen(true);
    cardRef.current?.showPopover?.();
  };
  const hide = () => {
    setOpen(false);
    cardRef.current?.hidePopover?.();
  };

  return (
    <span className={styles.wrap} style={vars}>
      <a
        className={styles.trigger}
        href="#"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
      >
        {label}
      </a>
      {/* @ts-ignore popover 는 React 타입 스텁에 없다 — 표준 HTML 속성 그대로 넘긴다 */}
      <div ref={cardRef} popover="manual" role="tooltip" className={styles.card} data-open={open}>
        <div className={styles.thumb} aria-hidden="true" />
        <p className={styles.title}>{title}</p>
        <p className={styles.desc}>{desc}</p>
      </div>
    </span>
  );
}
