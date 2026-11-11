import type { CSSProperties } from "react";
import styles from "./PressShrinkButton.module.scss";

export type PressShrinkButtonProps = {
  label: string;
  /** 눌렸다가 돌아오는 시간, 바운스 없음 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PressShrinkButton({
  label,
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
}: PressShrinkButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button type="button" className={styles.btn} style={vars}>
      {label}
    </button>
  );
}
