import type { CSSProperties, ReactNode } from "react";
import styles from "./ToastSlideIn.module.scss";

export type ToastSlideInProps = {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose?: () => void;
  /** 오른쪽에서 미끄러져 들어오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ToastSlideIn({
  visible,
  title,
  children,
  onClose,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ToastSlideInProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.toast} ${visible ? styles.isVisible : ""}`} style={vars} role="status" aria-live="polite">
      <span className={styles.bar} aria-hidden="true" />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{children}</p>
      </div>
      <button className={styles.close} type="button" aria-label="알림 닫기" onClick={onClose}>
        <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
          <line x1={5} y1={5} x2={19} y2={19} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
          <line x1={19} y1={5} x2={5} y2={19} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
