import type { CSSProperties, ReactNode } from "react";
import styles from "./StepperProgress.module.scss";

export type StepperProgressProps = {
  /** 완료된 단계 수 (0~labels.length) */
  step: number;
  labels?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function StepperProgress({
  step,
  labels = ["Info", "Shipping", "Payment"],
  duration = 400,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: StepperProgressProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const nodes: ReactNode[] = [];
  labels.forEach((l, i) => {
    if (i > 0) {
      nodes.push(<span key={`line-${i}`} className={i <= step - 1 ? `${styles.line} ${styles.on}` : styles.line} />);
    }
    nodes.push(
      <div key={`step-${i}`} className={styles.step} role="listitem">
        <span className={i < step ? `${styles.dot} ${styles.on}` : styles.dot}>{i + 1}</span>
        <span className={styles.label}>{l}</span>
      </div>
    );
  });

  return (
    <div className={styles.stepper} style={vars} role="list" aria-label="progress steps">
      {nodes}
    </div>
  );
}
