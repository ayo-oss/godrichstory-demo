import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StackedModals.module.scss";

export type StackedModalsProps = {
  firstTitle: string;
  firstDescription: string;
  nextLabel: string;
  secondTitle: string;
  secondDescription: string;
  backLabel: string;
  /** 두 번째 모달이 뜨는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StackedModals({
  firstTitle,
  firstDescription,
  nextLabel,
  secondTitle,
  secondDescription,
  backLabel,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: StackedModalsProps) {
  const [stacked, setStacked] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={stacked ? `${styles.overlay} ${styles.isStacked}` : styles.overlay} />
      <div className={stacked ? `${styles.modal} ${styles.back}` : styles.modal}>
        <h2>{firstTitle}</h2>
        <p>{firstDescription}</p>
        <button type="button" className={styles.next} onClick={() => setStacked(true)}>
          {nextLabel}
        </button>
      </div>
      <div className={stacked ? `${styles.modal2} ${styles.isOpen}` : styles.modal2}>
        <h2>{secondTitle}</h2>
        <p>{secondDescription}</p>
        <button type="button" className={styles.back2} onClick={() => setStacked(false)}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}
