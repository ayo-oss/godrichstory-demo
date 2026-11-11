import { useState } from "react";
import styles from "./FloatingLabelInput.module.scss";

export type FloatingLabelInputProps = {
  label?: string;
};

export default function FloatingLabelInput({ label = "이름" }: FloatingLabelInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className={styles.fl}>
      <div className={styles.control}>
        <input
          className={styles.input}
          id="fl-name"
          type="text"
          placeholder=" "
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
        />
        <label className={styles.label} htmlFor="fl-name">
          {label}
        </label>
      </div>
    </div>
  );
}
