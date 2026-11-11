import type { CSSProperties } from "react";
import styles from "./CardGridCrayon.module.scss";

export type CardGridCrayonItem = { label: string; badge: string; tint: "purple" | "yellow" | "blue" | "green" };

export type CardGridCrayonProps = {
  items?: CardGridCrayonItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ITEMS: CardGridCrayonItem[] = [
  { label: "손그림 아이콘", badge: "NEW", tint: "purple" },
  { label: "삐뚤빼뚤 카드", badge: "인기", tint: "yellow" },
  { label: "크레용 배지", badge: "신규", tint: "blue" },
  { label: "낙서 애니메이션", badge: "무료", tint: "green" },
];

export default function CardGridCrayon({
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff5a5f",
}: CardGridCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.grid} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="cg-rough" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency={0.06} numOctaves={2} seed={12} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {items.map((it, i) => (
        <article key={it.label} className={`${styles.card} ${styles[`tint_${it.tint}`]}`} style={{ animationDelay: `${i * 140}ms` }}>
          <svg className={styles.frame} viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
            <rect x={5} y={5} width={90} height={68} rx={12} className={`${styles.frameRect} ${styles.frameRectA}`} />
            <rect x={3} y={3} width={90} height={68} rx={12} className={`${styles.frameRect} ${styles.frameRectB}`} />
          </svg>
          <span className={styles.badge}>{it.badge}</span>
          <span className={styles.dot} />
          <p className={styles.label}>{it.label}</p>
        </article>
      ))}
    </div>
  );
}
