import type { CSSProperties } from "react";
import styles from "./NavBrutalist.module.scss";

export type NavLink = { label: string; active?: boolean };

export type NavBrutalistProps = {
  brand?: string;
  links?: NavLink[];
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavBrutalist({
  brand = "SLABKIT",
  links = [
    { label: "홈", active: true },
    { label: "기능" },
    { label: "요금제" },
    { label: "문의" },
  ],
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff4d1f",
}: NavBrutalistProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.nav} style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.links}>
        {links.map((l) => (
          <span key={l.label} className={`${styles.link} ${l.active ? styles.linkActive : ""}`}>
            {l.label}
          </span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
