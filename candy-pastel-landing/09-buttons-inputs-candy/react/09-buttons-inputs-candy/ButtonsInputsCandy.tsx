import type { CSSProperties } from "react";
import styles from "./ButtonsInputsCandy.module.scss";

export type ButtonsInputsCandyProps = {
  buttonLabel?: string;
  inputLabel?: string;
  placeholder?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsCandy({
  buttonLabel = "저장하기",
  inputLabel = "이메일",
  placeholder = "이메일을 적어보세요",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: ButtonsInputsCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ctrlcandy} style={vars}>
      <button type="button" className={styles.btn}>{buttonLabel}</button>
      <label className={styles.field}>
        <span className={styles.label}>{inputLabel}</span>
        <input className={styles.input} type="email" placeholder={placeholder} />
      </label>
    </div>
  );
}
