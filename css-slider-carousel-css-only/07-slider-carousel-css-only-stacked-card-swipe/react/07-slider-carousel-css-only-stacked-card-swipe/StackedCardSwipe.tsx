import type { CSSProperties } from "react";
import styles from "./StackedCardSwipe.module.scss";

export type StackedCardSwipeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StackedCardSwipe({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: StackedCardSwipeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.cs} style={vars}>
      {/* 카드 3장이 같은 자리(grid-area: 1/1)에 겹쳐 있고, @keyframes 하나가 순서대로 옆으로 빠진다 — 0줄 JS */}
      <div className={styles.deck}>
        {[1, 2, 3].map((n) => (
          <div key={n} className={`${styles.card} ${styles["card" + n]}`} />
        ))}
      </div>
    </div>
  );
}
