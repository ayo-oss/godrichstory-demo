import type { CSSProperties } from "react";
import styles from "./PlaceholderMismatch.module.scss";

export type PlaceholderMismatchProps = {
  duration?: number;
  easing?: string;
  color?: string;
  okLabel?: string;
  ngLabel?: string;
};

export default function PlaceholderMismatch({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  okLabel = "일치",
  ngLabel = "불일치",
}: PlaceholderMismatchProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="자리표시자 불일치 데모" role="img">
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.lines}>
            <p className={`${styles.line} ${styles.lineKo}`}>
              <span className={styles.ph} style={{ "--i": 0 } as CSSProperties}>{"{name}"}</span>
              <span className={styles.txt}>님, 주문이 </span>
              <span className={styles.ph} style={{ "--i": 1 } as CSSProperties}>{"{count}"}</span>
              <span className={styles.txt}>건 접수되었습니다</span>
            </p>
            <p className={`${styles.line} ${styles.lineEn}`}>
              <span className={styles.ph} style={{ "--i": 0 } as CSSProperties}>{"{count}"}</span>
              <span className={styles.txt}> orders placed for </span>
              <span className={styles.ph} style={{ "--i": 1 } as CSSProperties}>{"{name}"}</span>
            </p>
          </div>
          <span className={`${styles.verdict} ${styles.ok}`}>{okLabel}</span>
        </section>
        <section className={styles.card}>
          <div className={styles.lines}>
            <p className={`${styles.line} ${styles.lineKo}`}>
              <span className={styles.ph} style={{ "--i": 0 } as CSSProperties}>{"{date}"}</span>
              <span className={styles.txt}>에 환불이 완료되었습니다</span>
            </p>
            <p className={`${styles.line} ${styles.lineEn}`}>
              <span className={styles.txt}>Refund completed</span>
              <span className={`${styles.ph} ${styles.ghost}`} style={{ "--i": 0 } as CSSProperties}>{"{date}"}</span>
            </p>
          </div>
          <span className={`${styles.verdict} ${styles.ng}`}>{ngLabel}</span>
        </section>
      </div>
    </div>
  );
}
