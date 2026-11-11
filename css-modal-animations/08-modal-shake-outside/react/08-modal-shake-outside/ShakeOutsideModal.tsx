import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShakeOutsideModal.module.scss";

export type ShakeOutsideModalProps = {
  title: string;
  description: string;
  acceptLabel: string;
  onAccept?: () => void;
  /** 흔들림 지속 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShakeOutsideModal({
  title,
  description,
  acceptLabel,
  onAccept,
  duration = 300,
  easing = "cubic-bezier(.36,.07,.19,.97)",
  color = "#17141a",
}: ShakeOutsideModalProps) {
  const [shakeKey, setShakeKey] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.overlay} onClick={() => setShakeKey((k) => k + 1)} />
      <div
        key={shakeKey}
        className={shakeKey ? `${styles.modal} ${styles.isShaking}` : styles.modal}
        role="dialog"
        aria-modal="true"
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.accept} onClick={onAccept}>
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
