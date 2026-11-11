import type { CSSProperties } from "react";
import styles from "./HeadlineStaggerIn.module.scss";

export type HeadlineStaggerInProps = {
  lines?: [string, string, string];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeadlineStaggerIn({
  lines = ["Ship your idea.", "Faster than ever.", "Start free today."],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: HeadlineStaggerInProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <h1 className={styles.hero} style={vars}>
      <span className={`${styles.line} ${styles.line1}`}>{lines[0]}</span>
      <span className={`${styles.line} ${styles.line2}`}>{lines[1]}</span>
      <span className={`${styles.line} ${styles.line3}`}>{lines[2]}</span>
    </h1>
  );
}
