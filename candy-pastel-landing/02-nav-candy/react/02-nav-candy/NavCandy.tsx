import type { CSSProperties } from "react";
import styles from "./NavCandy.module.scss";

export type NavCandyProps = {
  brand?: string;
  tabs?: string[];
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavCandy({
  brand = "푸딩",
  tabs = ["홈", "기능", "요금제", "문의"],
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#b5e8d2",
}: NavCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.navcandy} aria-label="주요 메뉴" style={vars}>
      <span className={styles.brand}>{brand}</span>
      <div className={styles.track}>
        <span className={styles.pill} aria-hidden="true" />
        {tabs.map((t, i) => (
          <span key={t} className={`${styles.tab} ${i === 0 ? styles.tabOn : ""}`}>{t}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
