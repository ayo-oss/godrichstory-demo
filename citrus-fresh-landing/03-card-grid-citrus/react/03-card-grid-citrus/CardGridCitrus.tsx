import type { CSSProperties } from "react";
import styles from "./CardGridCitrus.module.scss";

export type CardGridCitrusItem = { badge: string; name: string; tone: "org" | "lim" | "grp" | "lem" };

export type CardGridCitrusProps = {
  items?: CardGridCitrusItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ITEMS: CardGridCitrusItem[] = [
  { badge: "NEW", name: "오렌지 알림", tone: "org" },
  { badge: "무료", name: "라임 위젯", tone: "lim" },
  { badge: "인기", name: "자몽 카드", tone: "grp" },
  { badge: "신규", name: "레몬 기록", tone: "lem" },
];

const TONE_CLASS: Record<CardGridCitrusItem["tone"], string> = {
  org: "cardOrg", lim: "cardLim", grp: "cardGrp", lem: "cardLem",
};

export default function CardGridCitrus({
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff9a52",
}: CardGridCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.gridcitrus} style={vars}>
      {items.map((it, i) => (
        <div
          key={it.name}
          className={`${styles.card} ${styles[TONE_CLASS[it.tone]]}`}
          style={{ animationDelay: `${(-duration / 4) * i}ms` } as CSSProperties}
        >
          <span className={styles.badge}>{it.badge}</span>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.name}>{it.name}</p>
        </div>
      ))}
    </div>
  );
}
