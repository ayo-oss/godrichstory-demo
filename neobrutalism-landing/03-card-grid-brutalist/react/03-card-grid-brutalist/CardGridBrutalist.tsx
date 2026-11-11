import type { CSSProperties } from "react";
import styles from "./CardGridBrutalist.module.scss";

export type GridCard = { label: string };

export type CardGridBrutalistProps = {
  cards?: GridCard[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--delay"?: string };

const DELAYS = ["0s", "-.5s", "-1s", "-1.5s"];

export default function CardGridBrutalist({
  cards = [
    { label: "빠른 검색" },
    { label: "자동 정리" },
    { label: "팀 채팅" },
    { label: "리포트" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CardGridBrutalistProps) {
  const base: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.grid} style={base}>
      {cards.map((c, i) => {
        const vars: Vars = { ...base, "--delay": DELAYS[i % DELAYS.length] };
        return (
          <div key={c.label} className={styles.card}>
            <div className={styles.body} style={vars}>
              <span className={styles.icon} aria-hidden="true" />
              <p className={styles.label}>{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
