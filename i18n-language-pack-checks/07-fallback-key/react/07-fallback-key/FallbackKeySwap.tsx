import type { CSSProperties } from "react";
import styles from "./FallbackKeySwap.module.scss";

export type FallbackKeySwapProps = {
  duration?: number;
  easing?: string;
  color?: string;
  rawKey?: string;
  fallback?: string;
  chip?: string;
};

export default function FallbackKeySwap({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
  rawKey = "welcome.title",
  fallback = "다시 오신 걸 환영합니다",
  chip = "폴백 적용",
}: FallbackKeySwapProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="폴백 처리 데모" role="img">
      <div className={styles.win}>
        <header className={styles.bar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </header>
        <div className={styles.body}>
          <div className={styles.slot}>
            <p className={styles.raw}>{rawKey}</p>
            <p className={styles.fb}>{fallback}</p>
          </div>
          <span className={styles.chip}>{chip}</span>
        </div>
      </div>
    </div>
  );
}
