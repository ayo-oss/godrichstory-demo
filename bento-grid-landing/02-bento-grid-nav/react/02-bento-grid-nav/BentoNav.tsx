import type { CSSProperties } from "react";
import styles from "./BentoNav.module.scss";

export type BentoNavProps = {
  brand?: string;
  items?: string[];
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoNav({
  brand = "Nectar",
  items = ["Home", "Features", "Pricing", "Contact"],
  cta = "Start for free",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BentoNavProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.navbar} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.pill}>
        <span className={styles.indicator} aria-hidden="true" />
        {items.map((label) => (
          <span key={label} className={styles.item}>{label}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
