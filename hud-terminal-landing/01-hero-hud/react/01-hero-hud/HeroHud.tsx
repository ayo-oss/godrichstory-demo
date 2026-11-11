import type { CSSProperties } from "react";
import styles from "./HeroHud.module.scss";

export type HeroHudProps = {
  brand?: string;
  title?: string;
  desc?: string;
  cta?: string;
  readout?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroHud({
  brand = "SENTRY / ONLINE",
  title = "놓치는 순간 없이 지켜보는 대시보드",
  desc = "실시간으로 감지하고 기록합니다",
  cta = "무료로 시작",
  readout = "SIG",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: HeroHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
      <div className={styles.scan} aria-hidden="true" />
      <p className={styles.eyebrow}>
        <span className={styles.dot} aria-hidden="true" />
        {brand}
      </p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.desc}>{desc}</p>
      <button type="button" className={styles.cta}>{cta}</button>
      <p className={styles.readoutLine}>
        {readout} <span className={styles.cursor} aria-hidden="true" />
      </p>
    </section>
  );
}
