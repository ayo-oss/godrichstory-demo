import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./BounceCheck.module.scss";

export type BounceCheckProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BounceCheck({
  label = "Get notifications",
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: BounceCheckProps) {
  const [checked, setChecked] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.check} style={vars}>
      <input
        type="checkbox"
        className={styles.srInput}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {checked && (
          <svg viewBox="0 0 24 24" className={styles.boxSvg}>
            <path className={styles.boxPath} d="M5 12.5 L10 17.5 L19 7" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </label>
  );
}
