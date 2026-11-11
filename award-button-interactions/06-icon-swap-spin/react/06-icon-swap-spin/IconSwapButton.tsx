import type { CSSProperties, ReactNode } from "react";
import styles from "./IconSwapButton.module.scss";

export type IconSwapButtonProps = {
  label?: string;
  front?: ReactNode;
  back?: ReactNode;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const cart = (
  <svg viewBox="0 0 256 256" width="34" height="34">
    <g fill="currentColor">
      <path d="m232 72l-25.63 92.28A16 16 0 0 1 191 176H92.16a16 16 0 0 1-15.41-11.72L51.11 72Z" opacity=".2" />
      <path d="M104 216a16 16 0 1 1-16-16a16 16 0 0 1 16 16m88-16a16 16 0 1 0 16 16a16 16 0 0 0-16-16m47.71-125.86l-25.64 92.28A24.06 24.06 0 0 1 191 184H92.16A24.06 24.06 0 0 1 69 166.42L33.92 40H16a8 8 0 0 1 0-16h24a8 8 0 0 1 7.71 5.86L57.19 64H232a8 8 0 0 1 7.71 10.14M221.47 80H61.64l22.81 82.14a8 8 0 0 0 7.71 5.86H191a8 8 0 0 0 7.71-5.86Z" />
    </g>
  </svg>
);

const check = (
  <svg viewBox="0 0 256 256" width="34" height="34">
    <g fill="currentColor">
      <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
      <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
    </g>
  </svg>
);

export default function IconSwapButton({
  label = "Add",
  front = cart,
  back = check,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: IconSwapButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.swap} style={vars}>
      <span className={styles.ic} aria-hidden="true">
        <span className={styles.face}>{front}</span>
        <span className={`${styles.face} ${styles.back}`}>{back}</span>
      </span>
      <span>{label}</span>
    </button>
  );
}
