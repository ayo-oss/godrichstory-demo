import { useState } from "react";
import styles from "./InlineValidation.module.scss";

export type InlineValidationProps = {
  label?: string;
};

const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InlineValidation({ label = "이메일" }: InlineValidationProps) {
  const [value, setValue] = useState("");
  const state = value === "" ? "idle" : RE.test(value) ? "ok" : "bad";

  return (
    <div className={styles.valid}>
      <label className={styles.label} htmlFor="email-field">{label}</label>
      <div className={`${styles.frame} ${state === "ok" ? styles.ok : ""} ${state === "bad" ? styles.badState : ""}`}>
        <input
          className={styles.input}
          id="email-field"
          type="email"
          placeholder="you@example.com"
          aria-describedby="email-field-msg"
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
        />
        <span className={styles.icon} aria-hidden="true">
          {state === "ok" ? "✓" : state === "bad" ? "!" : ""}
        </span>
      </div>
      <p className={styles.msg} id="email-field-msg" role="status">
        {state === "bad" ? "이메일 형식을 확인해 주세요" : ""}
      </p>
    </div>
  );
}
