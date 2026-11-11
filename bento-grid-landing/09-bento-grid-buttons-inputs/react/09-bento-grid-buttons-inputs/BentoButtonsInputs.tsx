import type { CSSProperties } from "react";
import styles from "./BentoButtonsInputs.module.scss";

export type BentoButtonsInputsProps = {
  placeholder?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoButtonsInputs({
  placeholder = "Email address",
  cta = "Sign up",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BentoButtonsInputsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <label className={styles.field}>
        <span className={styles.ring} aria-hidden="true" />
        <input className={styles.input} type="email" placeholder={placeholder} readOnly />
      </label>
      <button type="button" className={styles.btn}>{cta}</button>
    </form>
  );
}
