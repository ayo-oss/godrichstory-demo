import type { CSSProperties } from "react";
import styles from "./OdometerRoll.module.scss";

export type OdometerRollProps = {
  /** 3자리 정수 (0~999) */
  value: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--d-target"?: number };

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function OdometerRoll({
  value, label, duration = 2000, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6",
}: OdometerRollProps) {
  const digits = String(value).padStart(3, "0").split("").map(Number);

  return (
    <div className={styles.stat}>
      <div className={styles.odometer} aria-hidden="true">
        {digits.map((d, i) => {
          const vars: Vars = {
            "--duration": `${duration}ms`,
            "--easing": easing,
            "--color": color,
            "--d-target": d,
          };
          return (
            <div className={styles.digit} key={i}>
              <div className={styles.strip} style={vars}>
                {DIGITS.map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <span className={styles.sr}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
