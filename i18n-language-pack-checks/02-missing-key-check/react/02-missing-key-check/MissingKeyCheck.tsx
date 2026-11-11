import type { CSSProperties } from "react";
import styles from "./MissingKeyCheck.module.scss";

export type MissingKeyCheckProps = {
  duration?: number;
  easing?: string;
  color?: string;
  badge?: string;
};

const KO_KEYS = ["nav.home", "nav.about", "nav.cart", "nav.mypage"];
const EN_KEYS = ["nav.home", "nav.about", "nav.cart"];

export default function MissingKeyCheck({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
  badge = "누락",
}: MissingKeyCheckProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="한쪽 언어에만 있는 키 데모" role="img">
      <div className={styles.board}>
        <div className={styles.col}>
          <p className={styles.head}>ko</p>
          <ul className={styles.rows}>
            {KO_KEYS.map((k, i) => (
              <li key={k} className={styles.pill} style={{ "--i": i } as CSSProperties}>{k}</li>
            ))}
          </ul>
        </div>
        <div className={styles.col}>
          <p className={styles.head}>en</p>
          <ul className={styles.rows}>
            {EN_KEYS.map((k, i) => (
              <li key={k} className={`${styles.pill} ${styles.pillEn}`} style={{ "--i": i } as CSSProperties}>{k}</li>
            ))}
            <li className={styles.slot} style={{ "--i": 3 } as CSSProperties}>
              <span className={styles.badge}>{badge}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
