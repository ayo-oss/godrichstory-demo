import type { CSSProperties } from "react";
import styles from "./LanguagePackJson.module.scss";

export type LanguagePackJsonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  note?: string;
};

const KO_ROWS = ["내 서비스", "시작하기", "홈", "문의하기"];
const EN_ROWS = ["My Service", "Get started", "Home", ""];
const KEYS = ["title", "cta", "nav.home", "footer.contact"];

export default function LanguagePackJson({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
  note = "짝이 안 맞는 키 1개",
}: LanguagePackJsonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="언어팩 두 파일 비교 데모" role="img">
      <div className={styles.pack}>
        <section className={styles.file}>
          <header className={styles.head}><span className={styles.name}>ko.json</span></header>
          <ul className={styles.rows}>
            {KEYS.map((k, i) => (
              <li key={k} className={styles.row} style={{ "--i": i } as CSSProperties}>
                <span className={styles.key}>&quot;{k}&quot;</span>
                <span className={styles.val}>{KO_ROWS[i]}</span>
              </li>
            ))}
          </ul>
          <span className={styles.scan} />
        </section>
        <section className={styles.file}>
          <header className={styles.head}><span className={styles.name}>en.json</span></header>
          <ul className={styles.rows}>
            {KEYS.map((k, i) => (
              <li
                key={k}
                className={`${styles.row} ${i === 3 ? styles.rowMiss : ""}`}
                style={{ "--i": i } as CSSProperties}
              >
                <span className={styles.key}>&quot;{k}&quot;</span>
                {EN_ROWS[i]
                  ? <span className={styles.val}>{EN_ROWS[i]}</span>
                  : <span className={`${styles.val} ${styles.valEmpty}`} />}
                {i === 3 && <span className={styles.miss}>!</span>}
              </li>
            ))}
          </ul>
          <span className={styles.scan} />
        </section>
        <p className={styles.note}>{note}</p>
      </div>
    </div>
  );
}
