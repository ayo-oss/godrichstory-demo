import { CSSProperties } from "react";
import styles from "./PseudoOnlyConfetti.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface PseudoOnlyConfettiProps {
  duration?: string;
  easing?: string;
  color?: string;
}

// 마크업엔 요소를 하나도 더하지 않는다 — ::before·::after(module.scss) 만으로 점을 그린다
export default function PseudoOnlyConfetti({
  duration = "1.2s",
  easing = "ease-out",
  color = "#2f6df6",
}: PseudoOnlyConfettiProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.card} style={style}>
      <span className={styles.label}>완료</span>
    </div>
  );
}
