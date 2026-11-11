import type { CSSProperties } from "react";
import styles from "./NavChrome.module.scss";

export type NavChromeProps = {
  brand?: string;
  links?: string[];
  activeIndex?: number;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavChrome({
  brand = "Chroma",
  links = ["Home", "Features", "Pricing"],
  activeIndex = 0,
  cta = "Try it free",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: NavChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.nav} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.menu}>
        {links.map((label, i) => (
          <span key={label} className={i === activeIndex ? `${styles.label} ${styles.labelActive}` : styles.label}>
            {label}
          </span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
