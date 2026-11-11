import type { CSSProperties } from "react";
import styles from "./BentoCardGrid.module.scss";

export type BentoCardGridProps = {
  labels?: [string, string, string, string];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoCardGrid({
  labels = ["Instant search", "Auto-organize", "Team chat", "Reports"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: BentoCardGridProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.tileA, styles.tileB, styles.tileC, styles.tileD];

  return (
    <section className={styles.grid} style={vars}>
      {labels.map((label, i) => (
        <div key={label} className={`${styles.tile} ${cls[i]}`}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.label}>{label}</p>
        </div>
      ))}
    </section>
  );
}
