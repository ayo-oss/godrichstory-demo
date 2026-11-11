import { useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./FloatingLabel.module.scss";

export type FloatingLabelProps = {
  id?: string;
  label?: string;
  type?: string;
  /** 라벨이 떠오르는 시간(ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FloatingLabel({
  id = "fl-nick",
  label = "Nickname",
  type = "text",
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: FloatingLabelProps) {
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.fl} style={vars}>
      <input
        id={id}
        className={styles.input}
        type={type}
        placeholder=" "
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      />
      <span className={styles.bloom} aria-hidden="true" />
      <label htmlFor={id} className={styles.label}>{label}</label>
    </div>
  );
}
