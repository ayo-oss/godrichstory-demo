import type { CSSProperties } from "react";
import styles from "./AuroraNav.module.scss";

export type AuroraNavProps = {
  brand?: string;
  items?: string[];
  cta?: string;
  activeIndex?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraNav({
  brand = "Aurora",
  items = ["Home", "Features", "Pricing"],
  cta = "Try it free",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AuroraNavProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.nav} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.menu}>
        <span className={styles.pill} aria-hidden="true" />
        {items.map((label) => (
          <span key={label} className={styles.label}>{label}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
