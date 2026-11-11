import type { CSSProperties } from "react";
import styles from "./NavPaper.module.scss";

export type NavPaperProps = {
  brand?: string;
  /** 탭 이름 3개. 칩은 이 개수 안에서만 왕복한다 */
  tabs?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
  /** 탭 하나 + 간격. 칩 이동량은 이 값의 배수뿐이다 */
  step?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--step"?: string;
};

export default function NavPaper({
  brand = "공작실",
  tabs = ["홈", "재료", "요금"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#f6c453",
  step = 76,
}: NavPaperProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--step": `${step}px`,
  };

  return (
    <nav className={styles.navpaper} style={vars} aria-label="데모 내비게이션">
      <span className={styles.brand}>{brand}</span>
      <div className={styles.tabs}>
        <span className={styles.chip} aria-hidden="true" />
        {tabs.map((t) => <span key={t} className={styles.tab}>{t}</span>)}
      </div>
    </nav>
  );
}
