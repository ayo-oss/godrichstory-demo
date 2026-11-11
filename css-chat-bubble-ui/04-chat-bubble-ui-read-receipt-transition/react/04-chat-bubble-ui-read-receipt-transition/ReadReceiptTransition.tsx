import type { CSSProperties } from "react";
import styles from "./ReadReceiptTransition.module.scss";

export type ReadReceiptTransitionProps = {
  /** 상대가 읽었는가 */
  read: boolean;
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ReadReceiptTransition({
  read,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  className = "",
}: ReadReceiptTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.status} ${className}`} style={vars}>
      <span className={`${styles.unread} ${read ? styles.hide : ""}`}>1</span>
      <svg className={`${styles.check} ${read ? styles.show : ""}`} viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path d="M4 10.5 8 14.5 16 5.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
