import type { CSSProperties } from "react";
import styles from "./ButtonsInputsChrome.module.scss";

export type ButtonsInputsChromeProps = {
  placeholder?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsChrome({
  placeholder = "Email address",
  cta = "Sign up",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ButtonsInputsChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <input className={styles.input} type="email" placeholder={placeholder} readOnly />
      <button type="button" className={styles.btn}>{cta}</button>
    </form>
  );
}
