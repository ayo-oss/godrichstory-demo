import type { CSSProperties, ReactNode } from "react";
import styles from "./StickerBadgesCollage.module.scss";

export type StickerBadge = { word: string; bg?: string; rot?: string; icon?: ReactNode };
export type StickerBadgesCollageProps = {
  badges?: StickerBadge[];
  /** 배지끼리 어긋나는 간격(ms) */
  stagger?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BadgeVars = CSSProperties & { "--rot"?: string; background?: string; animationDelay?: string };

const defaultBadges: StickerBadge[] = [
  { word: "BEST", bg: "#ffd93d", rot: "-12deg" },
  { word: "NEW", bg: "#b6e34f", rot: "8deg" },
  { word: "PICK", bg: "#ffb3c7", rot: "-6deg" },
  { word: "2026", bg: "#ffffff", rot: "10deg" },
];

export default function StickerBadgesCollage({
  badges = defaultBadges,
  stagger = 500,
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#ffd93d",
}: StickerBadgesCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.scol} style={vars}>
      {badges.map((b, i) => {
        const bv: BadgeVars = {
          "--rot": b.rot ?? "0deg",
          background: b.bg ?? "#fff",
          animationDelay: `${-stagger * i}ms`,
        };
        return (
          <span key={b.word} className={styles.badge} style={bv}>
            <span className={styles.icon} aria-hidden="true">{b.icon}</span>
            <span className={styles.word}>{b.word}</span>
          </span>
        );
      })}
    </section>
  );
}
