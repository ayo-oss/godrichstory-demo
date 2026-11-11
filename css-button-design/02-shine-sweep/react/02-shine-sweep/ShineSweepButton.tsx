import type { CSSProperties, ReactNode } from "react";
import styles from "./ShineSweepButton.module.scss";

export type ShineSweepButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  children?: ReactNode;
};

export default function ShineSweepButton({
  duration = 600,
  easing = "ease-out",
  color = "#17141a",
  children = "지금 구매하기",
}: ShineSweepButtonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.label}>{children}</span>
    </button>
  );
}
