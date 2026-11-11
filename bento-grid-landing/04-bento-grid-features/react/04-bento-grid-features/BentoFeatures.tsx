import type { CSSProperties } from "react";
import styles from "./BentoFeatures.module.scss";

export type BentoFeaturesProps = {
  items?: { num: string; label: string }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoFeatures({
  items = [
    { num: "12,000+", label: "Connected apps" },
    { num: "99.9%", label: "Uptime" },
  ],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: BentoFeaturesProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.feat} style={vars}>
      {items.map((it, i) => (
        <div key={it.label} className={i === 1 ? `${styles.card} ${styles.cardB}` : styles.card}>
          <span className={styles.icon} aria-hidden="true" />
          <p className={styles.num}>{it.num}</p>
          <p className={styles.label}>{it.label}</p>
          <span className={styles.bar} aria-hidden="true" />
        </div>
      ))}
    </section>
  );
}
