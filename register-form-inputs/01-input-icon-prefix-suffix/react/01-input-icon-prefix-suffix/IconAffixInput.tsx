import { useState } from "react";
import styles from "./IconAffixInput.module.scss";

export type IconAffixInputProps = {
  emailLabel?: string;
  weightLabel?: string;
};

export default function IconAffixInput({
  emailLabel = "이메일",
  weightLabel = "몸무게",
}: IconAffixInputProps) {
  const [email, setEmail] = useState("");
  const [weight, setWeight] = useState("");

  return (
    <div className={styles.affix}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email-input">
          {emailLabel}
        </label>
        <div className={styles.control}>
          <svg
            className={styles.icon}
            aria-hidden="true"
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
          >
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M2.5 5L10 11L17.5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            className={`${styles.input} ${styles.inputPrefix}`}
            id="email-input"
            type="text"
            placeholder="you@example.com"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="weight-input">
          {weightLabel}
        </label>
        <div className={styles.control}>
          <input
            className={`${styles.input} ${styles.inputSuffix}`}
            id="weight-input"
            type="text"
            placeholder="0"
            value={weight}
            onChange={(e: any) => setWeight(e.target.value)}
          />
          <span className={styles.unit} aria-hidden="true">
            kg
          </span>
        </div>
      </div>
    </div>
  );
}
