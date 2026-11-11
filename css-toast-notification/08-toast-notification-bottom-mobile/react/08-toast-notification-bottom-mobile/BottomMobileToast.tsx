import type { CSSProperties } from "react";
import styles from "./BottomMobileToast.module.scss";

export type BottomMobileToastProps = {
  message: string;
  visible: boolean;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function BottomMobileToast({
  message,
  visible,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: BottomMobileToastProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <div className={`${styles.toast} ${visible ? styles.isVisible : ""}`} style={vars} role="status" aria-live="polite">
      <p className={styles.text}>{message}</p>
    </div>
  );
}
