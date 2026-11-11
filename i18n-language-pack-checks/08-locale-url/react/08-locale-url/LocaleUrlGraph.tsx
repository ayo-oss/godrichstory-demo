import type { CSSProperties } from "react";
import styles from "./LocaleUrlGraph.module.scss";

export type LocaleUrlGraphProps = {
  duration?: number;
  easing?: string;
  color?: string;
  note?: string;
};

export default function LocaleUrlGraph({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  note = "hreflang 없음",
}: LocaleUrlGraphProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="언어별 주소와 hreflang 데모" role="img">
      <figure className={styles.graph}>
        <svg className={styles.svg} viewBox="0 0 400 250" role="img" aria-label="locale url graph">
          <path className={styles.arcBase} d="M200 42 Q120 120 78 208" />
          <path className={styles.arcBase} d="M200 42 Q280 120 322 208" />
          <path className={styles.arcLink} d="M78 208 Q200 262 322 208" />
          <path className={styles.arcBroken} d="M322 208 Q200 170 78 208" />
          <path className={styles.arcPulse} d="M78 208 Q120 120 200 42 Q280 120 322 208 Q200 262 78 208" />
          <text className={styles.qmark} x="200" y="182">?</text>
          <g>
            <rect className={styles.nodeRect} x="166" y="26" width="68" height="32" rx="16" />
            <text className={styles.nodeTxt} x="200" y="47">/</text>
          </g>
          <g>
            <rect className={styles.nodeRect} x="46" y="192" width="64" height="32" rx="16" />
            <text className={styles.nodeTxt} x="78" y="213">/en/</text>
          </g>
          <g>
            <rect className={styles.nodeRect} x="290" y="192" width="64" height="32" rx="16" />
            <text className={styles.nodeTxt} x="322" y="213">/ja/</text>
          </g>
        </svg>
        <figcaption className={styles.graphNote}>{note}</figcaption>
      </figure>
    </div>
  );
}
