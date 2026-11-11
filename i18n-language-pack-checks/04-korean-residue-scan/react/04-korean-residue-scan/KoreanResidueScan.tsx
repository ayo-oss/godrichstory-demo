import type { CSSProperties } from "react";
import styles from "./KoreanResidueScan.module.scss";

export type KoreanResidueScanProps = {
  duration?: number;
  easing?: string;
  color?: string;
  badge?: string;
};

const LINES = [
  { text: '"welcome":   "Welcome back!"', hit: false },
  { text: '"orders":     "View your orders"', hit: false },
  { text: '"shipping":    "배송이 시작되었습니다."', hit: true },
  { text: '"account":    "My account"', hit: false },
  { text: '"refund":     "환불이 처리되었습니다."', hit: true },
];

export default function KoreanResidueScan({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  badge = "한글 잔존 2건",
}: KoreanResidueScanProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="번역 안 된 한글 잔존 데모" role="img">
      <div className={styles.doc}>
        <header className={styles.head}><span className={styles.name}>en.json</span></header>
        <ul className={styles.rows}>
          {LINES.map((l, i) => (
            <li
              key={i}
              className={`${styles.ln} ${l.hit ? styles.hit : ""}`}
              style={{ "--i": i } as CSSProperties}
            >
              <span className={styles.txt}>{l.text}</span>
            </li>
          ))}
        </ul>
        <span className={styles.scan} />
        <p className={styles.badge}>{badge}</p>
      </div>
    </div>
  );
}
