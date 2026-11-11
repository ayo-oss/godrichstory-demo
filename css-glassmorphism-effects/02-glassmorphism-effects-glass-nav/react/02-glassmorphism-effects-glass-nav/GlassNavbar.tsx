import { CSSProperties } from "react";
import styles from "./GlassNavbar.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
};

export interface GlassNavbarProps {
  duration?: string;
  easing?: string;
}

const LINKS = ["Home", "Docs", "Pricing"];

export default function GlassNavbar({
  duration = "220ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
}: GlassNavbarProps) {
  const style: Vars = { "--duration": duration, "--easing": easing };
  return (
    <nav className={styles.nav} style={style} aria-label="glass nav">
      <span className={styles.pill} aria-hidden="true" />
      {LINKS.map((label) => (
        <a key={label} className={styles.link} href="#">
          {label}
        </a>
      ))}
    </nav>
  );
}
