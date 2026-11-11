import { useState, type ChangeEvent } from "react";
import styles from "./CharacterCounterInput.module.scss";

export type CharacterCounterInputProps = {
  label?: string;
  max?: number;
};

const WARN_THRESHOLD = 12;

export default function CharacterCounterInput({ label = "자기소개", max = 80 }: CharacterCounterInputProps) {
  const [value, setValue] = useState("");
  const remaining = max - value.length;
  const isWarn = remaining <= WARN_THRESHOLD;

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value);

  return (
    <div className={styles.cc}>
      <label className={styles.label} htmlFor="cc-input-react">
        {label}
      </label>
      <textarea
        id="cc-input-react"
        className={isWarn ? `${styles.area} ${styles.warn}` : styles.area}
        maxLength={max}
        rows={3}
        placeholder="나를 한 줄로 소개해 보세요"
        value={value}
        onChange={onChange}
        aria-describedby="cc-count-react"
      />
      <p
        className={isWarn ? `${styles.count} ${styles.warn}` : styles.count}
        id="cc-count-react"
        aria-live="polite"
      >
        {value.length}/{max}
      </p>
    </div>
  );
}
