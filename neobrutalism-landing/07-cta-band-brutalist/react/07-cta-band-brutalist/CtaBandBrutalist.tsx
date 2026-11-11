import type { CSSProperties } from "react";
import styles from "./CtaBandBrutalist.module.scss";

export type CtaBandBrutalistProps = {
  title?: string;
  cta?: string;
  duration?: number;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function CtaBandBrutalist({
  title = "지금 팀에 합류시켜 보세요",
  cta = "무료로 시작",
  duration = 2000,
  color = "#ffd23f",
}: CtaBandBrutalistProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };

  return (
    <div className={styles.cta} style={vars}>
      <span className={styles.stripes} aria-hidden="true" />
      <h3 className={styles.title}>{title}</h3>
      <button type="button" className={styles.btn}>{cta}</button>
    </div>
  );
}
