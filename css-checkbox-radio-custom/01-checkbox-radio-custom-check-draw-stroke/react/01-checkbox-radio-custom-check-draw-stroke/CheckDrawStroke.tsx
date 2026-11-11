import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./CheckDrawStroke.module.scss";

export type CheckDrawStrokeProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CheckDrawStroke({
  label = "I agree to the terms",
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  defaultChecked = false,
}: CheckDrawStrokeProps) {
  const [checked, setChecked] = useState(defaultChecked);
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
        <svg viewBox="0 0 24 24" className={styles.boxSvg}>
          <path className={styles.boxPath} d="M5 12.5 L10 17.5 L19 7" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  );
}
