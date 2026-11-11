import type { CSSProperties } from "react";
import styles from "./IconSlideButton.module.scss";

export type IconSlideButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function IconSlideButton({
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff4d1f",
  label = "소개 더보기",
}: IconSlideButtonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.track}>
        <span className={styles.cell}>{label}</span>
        <span className={styles.cell}>
          {label}
          <svg className={styles.arrow} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
            <g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g>
          </svg>
        </span>
      </span>
    </button>
  );
}
