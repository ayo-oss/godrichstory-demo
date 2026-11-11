import type { CSSProperties } from "react";
import styles from "./Push3dButton.module.scss";

export type Push3dButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function Push3dButton({
  duration = 220,
  easing = "ease-out",
  color = "#ff7fae",
  label = "게임 시작",
}: Push3dButtonProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--depth": "8px",
  } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">{label}</button>
  );
}
