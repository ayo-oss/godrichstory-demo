import type { CSSProperties } from "react";
import styles from "./CardGridCandy.module.scss";

export type CardGridCandyProps = {
  cards?: { name: string; badge: string }[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TONE = ["lav", "lem", "pea", "min"] as const;

export default function CardGridCandy({
  cards = [
    { name: "귀여운 템플릿", badge: "NEW" },
    { name: "말랑한 폼", badge: "무료" },
    { name: "상큼한 알림", badge: "인기" },
    { name: "달콤한 기록", badge: "신규" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: CardGridCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.gridcandy} style={vars}>
      {cards.map((c, i) => (
        <div key={c.name} className={`${styles.card} ${styles[TONE[i % 4]]}`}>
          <span className={styles.badge}>{c.badge}</span>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.name}>{c.name}</p>
        </div>
      ))}
    </div>
  );
}
