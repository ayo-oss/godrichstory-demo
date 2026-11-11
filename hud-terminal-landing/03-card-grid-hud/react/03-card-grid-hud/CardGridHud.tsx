import type { CSSProperties } from "react";
import styles from "./CardGridHud.module.scss";

export type CardGridHudCard = { coord: string; label: string; alt?: boolean };

export type CardGridHudProps = {
  cards?: CardGridHudCard[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const defaultCards: CardGridHudCard[] = [
  { coord: "04.12", label: "감지" },
  { coord: "#A1", label: "추적", alt: true },
  { coord: "07.03", label: "기록" },
  { coord: "#C4", label: "분석", alt: true },
];

export default function CardGridHud({
  cards = defaultCards,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: CardGridHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.grid} style={vars}>
      {cards.map((card) => (
        <article key={card.coord} className={styles.card}>
          <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
          <div className={styles.scan} aria-hidden="true" />
          <span className={`${styles.coord} ${card.alt ? styles.coordAlt : ""}`}>{card.coord}</span>
          <span className={styles.icon} aria-hidden="true" />
          <p className={styles.label}>{card.label}</p>
        </article>
      ))}
    </div>
  );
}
