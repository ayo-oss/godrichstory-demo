import type { CSSProperties } from "react";
import styles from "./NavHud.module.scss";

export type NavHudProps = {
  brand?: string;
  links?: string[];
  status?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavHud({
  brand = "SENTRY",
  links = ["홈", "기능", "요금", "문의"],
  status = "LIVE",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: NavHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.nav} style={vars} aria-label={brand}>
      <span className={styles.brand}>{brand}</span>
      <ul className={styles.track}>
        {links.map((label) => (
          <li key={label} className={styles.item}>{label}</li>
        ))}
        <span className={styles.indicator} aria-hidden="true" />
      </ul>
      <span className={styles.status}>
        <span className={styles.dot} aria-hidden="true" />
        {status}
      </span>
    </nav>
  );
}
