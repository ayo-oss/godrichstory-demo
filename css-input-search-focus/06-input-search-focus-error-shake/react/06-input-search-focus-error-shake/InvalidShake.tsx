import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./InvalidShake.module.scss";

export type InvalidShakeProps = {
  id?: string;
  label?: string;
  message?: string;
  duration?: number;
  easing?: string;
  amount?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--amount"?: string };

export default function InvalidShake({
  id = "ie-email",
  label = "Email",
  message = "That doesn't look like a valid email",
  duration = 600,
  easing = "cubic-bezier(.36,.07,.19,.97)",
  amount = 5,
}: InvalidShakeProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--amount": `${amount}px` };

  return (
    <div className={styles.ie} style={vars}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.frame}>
        <span className={styles.bloom} aria-hidden="true" />
        <input
          id={id}
          className={styles.input}
          type="email"
          required
          placeholder=" "
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />
        <svg className={`${styles.icon} ${styles.ok}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" /></svg>
        <svg className={`${styles.icon} ${styles.bad}`} viewBox="0 0 24 24" aria-hidden="true"><line x1="7" y1="7" x2="17" y2="17" /><line x1="17" y1="7" x2="7" y2="17" /></svg>
      </div>
      <p className={styles.msg} role="alert">{message}</p>
    </div>
  );
}
