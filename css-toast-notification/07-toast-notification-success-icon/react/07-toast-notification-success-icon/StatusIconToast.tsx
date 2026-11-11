import type { CSSProperties } from "react";
import styles from "./StatusIconToast.module.scss";

export type StatusIconToastProps = {
  title: string;
  message: string;
  /** 상태색. 성공은 파랑, 실패는 error 색을 넘긴다 */
  color?: string;
  resolved?: boolean;
};

type Vars = CSSProperties & { "--color"?: string };

export default function StatusIconToast({
  title,
  message,
  color = "#2f6df6",
  resolved = true,
}: StatusIconToastProps) {
  const vars: Vars = { "--color": color };

  return (
    <div className={styles.toast} style={vars} role="status" aria-live="polite">
      <span className={styles.badge} aria-hidden="true">
        <svg className={`${styles.layer} ${styles.neutral}`} viewBox="0 0 24 24" width={28} height={28} style={{ opacity: resolved ? 0 : 0.3 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={2} />
        </svg>
        <svg className={`${styles.layer} ${styles.colored}`} viewBox="0 0 24 24" width={28} height={28} style={{ opacity: resolved ? 1 : 0 }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={2} />
          <polyline
            className={styles.check}
            points="7 12.5 10.5 16 17 8.5"
            pathLength={100}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDashoffset: resolved ? 0 : 100 }}
          />
        </svg>
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{message}</p>
      </div>
    </div>
  );
}
