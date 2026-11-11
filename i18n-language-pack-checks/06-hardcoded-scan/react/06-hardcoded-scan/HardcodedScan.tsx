import type { CSSProperties } from "react";
import styles from "./HardcodedScan.module.scss";

export type HardcodedScanProps = {
  duration?: number;
  easing?: string;
  color?: string;
  badge?: string;
};

const LINES = [
  { code: "<button>구매하기</button>", hard: true },
  { code: "<button>{t('buy.now')}</button>", hard: false },
  { code: "<h2>자주 묻는 질문</h2>", hard: true },
  { code: "<a href=\"/en/\">{t('nav.faq')}</a>", hard: false },
  { code: "<p>배송 안내</p>", hard: true },
];

export default function HardcodedScan({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
  badge = "하드코딩 3곳",
}: HardcodedScanProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="하드코딩 글자 스캔 데모" role="img">
      <div className={styles.editor}>
        <header className={styles.head}>
          <span className={styles.dot} />
          <span className={styles.name}>index.html</span>
        </header>
        <ul className={styles.rows}>
          {LINES.map((l, i) => (
            <li
              key={i}
              className={`${styles.cl} ${l.hard ? styles.hard : ""}`}
              style={{ "--i": i } as CSSProperties}
            >
              <span className={styles.bar} />
              <span className={styles.txt}>{l.code}</span>
            </li>
          ))}
        </ul>
        <span className={styles.scan} />
        <p className={styles.badge}>{badge}</p>
      </div>
    </div>
  );
}
