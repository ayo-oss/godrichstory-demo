import type { CSSProperties } from "react";
import styles from "./ButtonsInputsBrutalist.module.scss";

export type ButtonsInputsBrutalistProps = {
  placeholder?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsBrutalist({
  placeholder = "이메일 주소",
  cta = "등록하기",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: ButtonsInputsBrutalistProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <label className={styles.field}>
        <input className={styles.input} type="email" placeholder={placeholder} readOnly />
      </label>
      <button type="button" className={styles.btn}>{cta}</button>
    </form>
  );
}
