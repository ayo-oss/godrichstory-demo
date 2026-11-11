import type { CSSProperties } from "react";
import styles from "./CtaBandHud.module.scss";

export type CtaBandHudProps = {
  eyebrow?: string;
  title?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandHud({
  eyebrow = "ALERT",
  title = "지금 바로 감시망을 켜보세요",
  cta = "무료 체험 시작",
  duration = 2000,
  easing = "ease-out",
  color = "#ffd23f",
}: CtaBandHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.band} style={vars}>
      <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
      <div className={styles.scan} aria-hidden="true" />
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <button type="button" className={styles.cta}>{cta}</button>
    </div>
  );
}
