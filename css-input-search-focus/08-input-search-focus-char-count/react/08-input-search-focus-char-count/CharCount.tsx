import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./CharCount.module.scss";

export type CharCountProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  maxLength?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CharCount({
  id = "cc-bio",
  label = "Bio",
  placeholder = "Write a short bio (40 characters max)",
  maxLength = 40,
  duration = 140,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: CharCountProps) {
  const [value, setValue] = useState("");
  const [bump, setBump] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setBump(false);
    requestAnimationFrame(() => setBump(true));
  };

  return (
    <div className={styles.cc} style={vars}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <textarea
        id={id}
        className={styles.input}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={2}
        value={value}
        onChange={onChange}
      />
      <span className={styles.count} aria-live="polite">
        <b className={bump ? `${styles.num} ${styles.bump}` : styles.num} onAnimationEnd={() => setBump(false)}>
          {value.length}
        </b>
        /{maxLength}
      </span>
    </div>
  );
}
