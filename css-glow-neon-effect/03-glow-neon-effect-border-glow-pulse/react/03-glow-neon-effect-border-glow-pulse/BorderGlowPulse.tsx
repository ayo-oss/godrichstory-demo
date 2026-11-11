import type { CSSProperties, ReactNode } from "react";
import styles from "./BorderGlowPulse.module.scss";

export type BorderGlowPulseProps = {
  /** 펄스 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
  /** 카드 안에 넣을 내용. 기본은 뼈대(스켈레톤) 두 줄 */
  children?: ReactNode;
};

export default function BorderGlowPulse({
  duration = 2000,
  color = "#39ff88",
  children,
}: BorderGlowPulseProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <div className={styles.card} style={vars}>
      <span className={styles.dot} aria-hidden="true" />
      {children ?? (
        <>
          <span className={`${styles.bar} ${styles.barLg}`} />
          <span className={`${styles.bar} ${styles.barSm}`} />
        </>
      )}
    </div>
  );
}
