import type { CSSProperties } from "react";
import styles from "./AuroraCtaBand.module.scss";

export type AuroraCtaBandProps = {
  title?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraCtaBand({
  title = "Start right now",
  cta = "Start for free",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: AuroraCtaBandProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.band} style={vars}>
      <h3 className={styles.title}>{title}</h3>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
