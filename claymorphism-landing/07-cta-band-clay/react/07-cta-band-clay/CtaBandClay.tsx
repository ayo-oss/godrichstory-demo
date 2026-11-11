import type { CSSProperties } from "react";
import styles from "./CtaBandClay.module.scss";

export type CtaBandClayProps = {
  title?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandClay({
  title = "지금 팀에 합류시켜 보세요",
  cta = "무료로 시작",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: CtaBandClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.band} style={vars}>
      <div className={styles.glow} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      <button type="button" className={styles.cta}>{cta}</button>
    </div>
  );
}
