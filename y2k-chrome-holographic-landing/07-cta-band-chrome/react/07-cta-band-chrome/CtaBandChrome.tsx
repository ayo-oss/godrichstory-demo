import type { CSSProperties } from "react";
import styles from "./CtaBandChrome.module.scss";

export type CtaBandChromeProps = {
  title?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandChrome({
  title = "Switch your screen today",
  cta = "Start for free",
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: CtaBandChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.cta} style={vars}>
      <h3 className={styles.title}>{title}</h3>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
