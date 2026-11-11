import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./DayNightToggle.module.scss";

export type DayNightToggleProps = {
  label?: string;
  duration?: number;
  easing?: string;
  /** 밤 트랙 색 */
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DayNightToggle({
  label = "야간 모드",
  duration = 600,
  easing = "ease-out",
  color = "#17141a",
  defaultChecked = false,
  onChange,
}: DayNightToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.switch} style={vars}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className={styles.switch__input}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setChecked(e.target.checked); onChange?.(e.target.checked); }}
      />
      <span className={styles.switch__track}>
        <span className={`${styles.switch__star} ${styles["switch__star--1"]}`} />
        <span className={`${styles.switch__star} ${styles["switch__star--2"]}`} />
        <span className={`${styles.switch__star} ${styles["switch__star--3"]}`} />
        <span className={styles.switch__knob}>
          <svg className={styles["switch__icon--sun"]} viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" fill="currentColor" />
            <g stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
              <line x1="8" y1="0.5" x2="8" y2="2.4" />
              <line x1="8" y1="13.6" x2="8" y2="15.5" />
              <line x1="0.5" y1="8" x2="2.4" y2="8" />
              <line x1="13.6" y1="8" x2="15.5" y2="8" />
            </g>
          </svg>
          <svg className={styles["switch__icon--moon"]} viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <path d="M10.5 2.5a6 6 0 100 11 7 7 0 010-11z" fill="currentColor" />
          </svg>
        </span>
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
