import type { CSSProperties } from "react";
import styles from "./MetalDialCta.module.scss";

export type MetalDialCtaProps = {
  label?: string;
  hint?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MetalDialCta({
  label = "무료로 시작",
  hint = "다이얼을 돌려 살펴 보세요",
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f4f5f8",
}: MetalDialCtaProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.metaldial} style={vars}>
      <p className={styles.label}>{label}</p>
      <button type="button" className={styles.dial} aria-label={label}>
        <span className={styles.rim} aria-hidden="true" />
        <span className={styles.face} aria-hidden="true" />
        <span className={styles.cap} aria-hidden="true" />
        <span className={styles.pointer} aria-hidden="true" />
      </button>
      <p className={styles.hint}>{hint}</p>
    </section>
  );
}
