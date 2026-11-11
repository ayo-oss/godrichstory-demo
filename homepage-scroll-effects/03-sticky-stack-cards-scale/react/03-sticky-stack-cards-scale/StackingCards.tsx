import type { CSSProperties } from "react";
import styles from "./StackingCards.module.scss";

export type StackingCardsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STEPS = [
  { n: 1, label: "가입하기" },
  { n: 2, label: "프로필 채우기" },
  { n: 3, label: "취향 고르기" },
  { n: 4, label: "완성" },
];

export default function StackingCards({ duration = 300, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: StackingCardsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.sk} style={vars}>
      {/* 카드마다 position: sticky — top 이 한 칸씩 깊어져 다음 카드가 위에 포개진다 */}
      <div className={styles.scroller}>
        {STEPS.map((s) => (
          <div key={s.n} className={`${styles.card} ${styles["card" + s.n]}`}>
            <span className={styles.step}>{s.n}</span>
            <span className={styles.label}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
