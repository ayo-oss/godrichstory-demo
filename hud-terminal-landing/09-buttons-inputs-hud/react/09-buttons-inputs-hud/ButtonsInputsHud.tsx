import type { CSSProperties } from "react";
import styles from "./ButtonsInputsHud.module.scss";

export type ButtonsInputsHudProps = {
  buttonLabel?: string;
  placeholder?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsHud({
  buttonLabel = "락온 시작",
  placeholder = "이메일 주소",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
}: ButtonsInputsHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <button type="button" className={styles.btn}>
        <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
        {buttonLabel}
      </button>
      <label className={styles.field}>
        <input className={styles.input} type="email" placeholder={placeholder} readOnly />
        <span className={styles.caret} aria-hidden="true" />
      </label>
    </form>
  );
}
