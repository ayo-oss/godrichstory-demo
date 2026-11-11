import type { CSSProperties, MouseEvent } from "react";
import styles from "./ButtonGlowHover.module.scss";

export type ButtonGlowHoverProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

export default function ButtonGlowHover({
  duration = 300,
  easing = "ease-out",
  color = "#00e5ff",
  label = "다음",
  onClick,
}: ButtonGlowHoverProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} type="button" style={vars} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden="true">
        <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
