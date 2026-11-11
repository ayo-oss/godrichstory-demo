import type { CSSProperties } from "react";
import styles from "./NavCrayon.module.scss";

export type NavCrayonProps = {
  brand?: string;
  tabs?: string[];
  active?: number;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavCrayon({
  brand = "크레용",
  tabs = ["홈", "클래스", "요금제", "문의"],
  active = 0,
  cta = "체험 신청",
  duration = 2000,
  easing = "ease-out",
  color = "#ff5a5f",
}: NavCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.nav} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="nc-rough" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency={0.06} numOctaves={2} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span className={styles.brand}>{brand}</span>
      <ul className={styles.list}>
        {tabs.map((t, i) => (
          <li key={t} className={styles.item}>
            <span className={i === active ? `${styles.label} ${styles.labelActive}` : styles.label}>{t}</span>
            {i === active && (
              <svg className={styles.loop} viewBox="0 0 56 30" aria-hidden="true">
                <path className={styles.loopPath} d="M28 4 C 13 2, 4 11, 7 17 C 9 25, 20 28, 29 26 C 41 24, 50 17, 47 10 C 45 4, 33 2, 25 5" />
              </svg>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
