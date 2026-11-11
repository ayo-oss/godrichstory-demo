import type { CSSProperties } from "react";
import styles from "./CtaBandNeu.module.scss";

export type CtaBandNeuProps = {
  title?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandNeu({
  title = "지금 팀에 합류시켜 보세요",
  cta = "무료로 시작",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: CtaBandNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.band} style={vars}>
      <span className={styles.glow} aria-hidden="true" />
      <h3 className={styles.title}>{title}</h3>
      <button type="button" className={styles.btn}>{cta}</button>
    </div>
  );
}
