import type { CSSProperties } from "react";
import styles from "./PillLoaderButton.module.scss";

export type PillLoaderButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  busyColor?: string;
  busy?: boolean;
  label?: string;
};

export default function PillLoaderButton({
  duration = 1000,
  easing = "ease-in-out",
  color = "#2f6df6",
  busyColor = "#3a2bb8",
  busy = false,
  label = "파일 보내기",
}: PillLoaderButtonProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--busy": busyColor,
  } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} data-busy={busy || undefined} type="button">
      <span className={styles.label}>{label}</span>
      <span className={styles.loader} aria-hidden="true">
        <span className={styles.track}><span className={styles.bar} /></span>
      </span>
    </button>
  );
}
