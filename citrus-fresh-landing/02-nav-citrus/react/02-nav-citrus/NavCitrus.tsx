import type { CSSProperties } from "react";
import styles from "./NavCitrus.module.scss";

export type NavCitrusProps = {
  brand?: string;
  tabs?: string[];
  active?: number;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NavCitrus({
  brand = "스퀴즈",
  tabs = ["홈", "기능", "요금제", "문의"],
  active = 0,
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#9ad200",
}: NavCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.navcitrus} style={vars} aria-label="주요 메뉴">
      <span className={styles.brand}>{brand}</span>
      <div className={styles.track}>
        <span className={styles.wedge} aria-hidden="true" style={{ "--activeIndex": active } as CSSProperties} />
        {tabs.map((t, i) => (
          <span key={t} className={`${styles.tab} ${i === active ? styles.tabOn : ""}`}>{t}</span>
        ))}
      </div>
      <button type="button" className={styles.cta}>{cta}</button>
    </nav>
  );
}
