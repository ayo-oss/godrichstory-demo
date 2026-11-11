import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BottomTabBar.module.scss";

export type BottomTabBarProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const TABS = ["홈", "검색", "찜", "마이"];

export default function BottomTabBar({
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: BottomTabBarProps) {
  const [active, setActive] = useState(0);

  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--i": active,
  };

  return (
    <div className={styles.stage} style={vars}>
      <nav className={styles.tabbar} aria-label="하단 내비게이션">
        {TABS.map((label, i) => (
          <button
            key={label}
            className={styles.tab}
            type="button"
            data-active={i === active}
            aria-current={i === active ? "page" : undefined}
            onClick={() => setActive(i)}
          >
            <span className={styles.ic} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </button>
        ))}
        <span className={styles.indicator} aria-hidden="true" />
      </nav>
    </div>
  );
}
