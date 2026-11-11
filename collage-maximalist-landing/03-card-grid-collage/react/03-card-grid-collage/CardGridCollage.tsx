import type { CSSProperties, ReactNode } from "react";
import styles from "./CardGridCollage.module.scss";

export type CardGridCollageCard = { no: string; name: string; icon?: ReactNode };
export type CardGridCollageProps = {
  cards?: CardGridCollageCard[];
  /** 카드끼리 어긋나는 간격(ms) */
  stagger?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CardVars = CSSProperties & { "--rot"?: string; animationDelay?: string };

const defaultCards: CardGridCollageCard[] = [
  { no: "01", name: "화보" },
  { no: "02", name: "색면" },
  { no: "03", name: "활자" },
];
const angles = ["-7deg", "5deg", "-4deg"];
const colorFills = [
  "linear-gradient(150deg, #d93a1e 0%, #ffd93d 100%)",
  "linear-gradient(150deg, #2d6fb5 0%, #b6e34f 100%)",
  "linear-gradient(150deg, #6b3fa0 0%, #d93a1e 100%)",
];

export default function CardGridCollage({
  cards = defaultCards,
  stagger = 240,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#d93a1e",
}: CardGridCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ccol} style={vars}>
      {cards.map((c, i) => {
        const cv: CardVars = { "--rot": angles[i % angles.length], animationDelay: `${-stagger * i}ms` };
        return (
          <article key={c.no} className={styles.card} style={cv}>
            <span className={styles.photo} style={{ background: colorFills[i % colorFills.length] }} aria-hidden="true">
              {c.icon}
            </span>
            <p className={styles.no}>{c.no}</p>
            <p className={styles.name}>{c.name}</p>
          </article>
        );
      })}
    </section>
  );
}
