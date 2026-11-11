import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ProgressCloseToast.module.scss";

export type ProgressCloseToastProps = {
  title: string;
  message: string;
  onDismiss?: () => void;
  /** 진행바가 다 닳기까지 실제 시간 (기본 5000ms) */
  duration?: number;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function ProgressCloseToast({
  title,
  message,
  onDismiss,
  duration = 5000,
  color = "#2f6df6",
}: ProgressCloseToastProps) {
  const barRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !onDismiss) return;
    const onEnd = () => onDismiss();
    bar.addEventListener("animationend", onEnd);
    return () => bar.removeEventListener("animationend", onEnd);
  }, [onDismiss]);

  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };

  return (
    <div className={styles.toast} style={vars} role="status" aria-live="polite">
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{message}</p>
      </div>
      <span ref={barRef} className={styles.bar} aria-hidden="true" />
    </div>
  );
}
