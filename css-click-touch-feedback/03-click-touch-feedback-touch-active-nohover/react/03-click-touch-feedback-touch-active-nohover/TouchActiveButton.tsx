import type { CSSProperties } from "react";
import styles from "./TouchActiveButton.module.scss";

export type TouchActiveButtonProps = {
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** @media (hover: none) and (pointer: coarse) 에서만 :active 배경이 걸린다. 마우스 기기에서는 이 규칙이 아예 읽히지 않는다. */
export default function TouchActiveButton({
  label,
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: TouchActiveButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button type="button" className={styles.btn} style={vars}>
      {label}
    </button>
  );
}
