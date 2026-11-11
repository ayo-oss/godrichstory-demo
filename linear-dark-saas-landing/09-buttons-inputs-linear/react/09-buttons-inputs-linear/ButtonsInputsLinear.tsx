import type { CSSProperties } from "react";
import styles from "./ButtonsInputsLinear.module.scss";

export type ButtonsInputsLinearProps = {
  placeholder?: string;
  ghostLabel?: string;
  primaryLabel?: string;
  /** 글로우·포커스 링이 커졌다 작아지는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsLinear({
  placeholder = "Email address",
  ghostLabel = "Learn more",
  primaryLabel = "Start for free",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: ButtonsInputsLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <label className={styles.field}>
        <input className={styles.input} type="email" placeholder={placeholder} readOnly />
      </label>
      <div className={styles.row}>
        <button type="button" className={styles.ghost}>{ghostLabel}</button>
        <button type="button" className={styles.primary}>{primaryLabel}</button>
      </div>
    </form>
  );
}
