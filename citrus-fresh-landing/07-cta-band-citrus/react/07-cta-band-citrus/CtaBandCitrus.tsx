import type { CSSProperties } from "react";
import styles from "./CtaBandCitrus.module.scss";

export type CtaBandCitrusProps = {
  title?: string;
  sub?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandCitrus({
  title = "지금 상큼하게 시작하기",
  sub = "무료로 시작해 보세요",
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff6a00",
}: CtaBandCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ctacitrus} style={vars}>
      <div className={styles.scrim}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>{sub}</p>
      </div>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
