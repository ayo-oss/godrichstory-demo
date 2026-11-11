import type { CSSProperties, MouseEvent } from "react";
import styles from "./GroupHoverIconCard.module.scss";

export type GroupHoverIconCardProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GroupHoverIconCard({
  label = "Learn more",
  duration = 200,
  easing = "ease-out",
  color = "#2f6df6",
}: GroupHoverIconCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <a className={styles.card} href="#" style={vars} onClick={(e: MouseEvent) => e.preventDefault()}>
      <span className={styles.card__text}>{label}</span>
      <span className={styles.arrow}>
        <span className={styles.arrow__line} />
        <span className={styles.arrow__head} />
      </span>
    </a>
  );
}
