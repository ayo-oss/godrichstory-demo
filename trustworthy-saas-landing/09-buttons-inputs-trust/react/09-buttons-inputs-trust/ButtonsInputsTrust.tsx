import type { CSSProperties } from "react";
import styles from "./ButtonsInputsTrust.module.scss";

export type ButtonsInputsTrustProps = {
  label?: string;
  placeholder?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsTrust({
  label = "이메일",
  placeholder = "you@company.com",
  cta = "계속하기",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: ButtonsInputsTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.controls} style={vars}>
      <label className={styles.field}>
        <span className={styles.label}>{label}</span>
        <input className={styles.input} type="text" placeholder={placeholder} />
      </label>
      <button type="button" className={styles.btn}>{cta}</button>
    </div>
  );
}
