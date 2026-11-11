import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./IconSwapToggle.module.scss";

export type IconSwapToggleProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IconSwapToggle({
  label = "이 기기 허용",
  duration = 220,
  easing = "cubic-bezier(0.34, 1.56, 0.64, 1)",
  color = "#2f6df6",
  defaultChecked = false,
  onChange,
}: IconSwapToggleProps) {
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
        <span className={styles["switch__bg--off"]} />
        <span className={styles["switch__bg--on"]} />
        <span className={styles.switch__knob}>
          <svg className={styles["switch__icon--x"]} viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
          <svg className={styles["switch__icon--check"]} viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
