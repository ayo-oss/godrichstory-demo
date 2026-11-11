import type { CSSProperties } from "react";
import styles from "./CtaBandCandy.module.scss";

export type CtaBandCandyProps = {
  title?: string;
  sub?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandCandy({
  title = "지금 달콤하게 시작하기",
  sub = "무료로 시작해 보세요",
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: CtaBandCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ctacandy} style={vars}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub}>{sub}</p>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
