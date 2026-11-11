import type { CSSProperties } from "react";
import styles from "./MiniExpandRail.module.scss";

export type MiniExpandRailProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const ITEMS = ["홈", "검색", "설정"];

export default function MiniExpandRail({
  duration = 300,
  easing = "ease-out",
  color = "#ffd23f",
}: MiniExpandRailProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <nav className={styles.rail} tabIndex={0} aria-label="사이드 내비게이션">
        <div className={styles.inner}>
          {ITEMS.map((label) => (
            <a key={label} className={styles.item} href="#">
              <span className={styles.ic} aria-hidden="true" />
              <span className={styles.label}>{label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
