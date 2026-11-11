import type { CSSProperties } from "react";
import styles from "./DuotoneWipeButton.module.scss";

export type DuotoneWipeButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function DuotoneWipeButton({
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9d6f",
  label = "시작하기",
}: DuotoneWipeButtonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.wash} aria-hidden="true" />
      <span className={styles.labels}>
        <span className={styles.tOnDark}>{label}</span>
        <span className={styles.tOnLight}>{label}</span>
      </span>
    </button>
  );
}
