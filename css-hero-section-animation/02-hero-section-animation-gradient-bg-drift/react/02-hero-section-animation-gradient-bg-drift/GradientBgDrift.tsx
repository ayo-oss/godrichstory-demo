import type { CSSProperties } from "react";
import styles from "./GradientBgDrift.module.scss";

export type GradientBgDriftProps = {
  eyebrow?: string;
  title?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GradientBgDrift({
  eyebrow = "New arrival",
  title = "Build in color.",
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: GradientBgDriftProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
    </section>
  );
}
