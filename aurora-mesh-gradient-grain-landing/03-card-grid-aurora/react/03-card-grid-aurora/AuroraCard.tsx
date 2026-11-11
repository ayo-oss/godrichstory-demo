import type { CSSProperties } from "react";
import styles from "./AuroraCard.module.scss";

export type AuroraCardProps = {
  title?: string;
  desc?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraCard({
  title = "Real-time sync",
  desc = "Stays in sync across every device.",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: AuroraCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars}>
      <div className={styles.body}>
        <span className={styles.icon} aria-hidden="true" />
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{desc}</p>
      </div>
    </article>
  );
}
