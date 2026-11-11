import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./PasswordEyeToggle.module.scss";

export type PasswordEyeToggleProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  showLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PasswordEyeToggle({
  id = "pw-input",
  label = "Password",
  placeholder = "Enter your password",
  showLabel = "Show password",
  duration = 220,
  easing = "cubic-bezier(.3,1.6,.4,1)",
  color = "#fff7e6",
}: PasswordEyeToggleProps) {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pw} style={vars}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.frame}>
        <input
          id={id}
          className={styles.input}
          type={shown ? "text" : "password"}
          placeholder={placeholder}
          autoComplete="current-password"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />
        <button
          type="button"
          className={shown ? `${styles.eye} ${styles.shown}` : styles.eye}
          aria-label={showLabel}
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
        >
          <svg className={`${styles.icon} ${styles.eyeIcon}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
          <svg className={`${styles.icon} ${styles.offIcon}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5c1.7 0 3.2.4 4.5 1.1M22 12s-1.4 2.5-4 4.4M6.5 6.5 3 3m1.5 1.5L21 21" /></svg>
        </button>
      </div>
    </div>
  );
}
