import type { CSSProperties } from "react";
import styles from "./TFunctionFlow.module.scss";

export type TFunctionFlowProps = {
  duration?: number;
  easing?: string;
  color?: string;
  keyName?: string;
  output?: string;
};

export default function TFunctionFlow({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  keyName = "cta.start",
  output = "시작하기",
}: TFunctionFlowProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars} aria-label="t() 함수 변환 흐름 데모" role="img">
      <div className={styles.pipe}>
        <div className={`${styles.node} ${styles.nodeKey}`}>
          <span className={styles.tag}>key</span>
          <span className={styles.keyTxt}>{keyName}</span>
        </div>
        <span className={`${styles.wire} ${styles.wireIn}`} />
        <div className={`${styles.node} ${styles.nodeFn}`}>
          <span className={styles.fnTxt}>t()</span>
        </div>
        <span className={`${styles.wire} ${styles.wireOut}`} />
        <div className={`${styles.node} ${styles.nodeOut}`}>
          <span className={styles.tagOut}>ko</span>
          <span className={styles.val}>{output}</span>
        </div>
      </div>
      <div className={styles.belt} aria-hidden="true" />
    </div>
  );
}
