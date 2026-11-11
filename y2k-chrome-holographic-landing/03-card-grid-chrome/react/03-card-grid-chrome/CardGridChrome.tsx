import type { CSSProperties } from "react";
import styles from "./CardGridChrome.module.scss";

export type CardGridChromeProps = {
  title?: string;
  desc?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CardGridChrome({
  title = "Live preview",
  desc = "Every change reflects on screen instantly.",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: CardGridChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars}>
      <span className={styles.icon} aria-hidden="true" />
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{desc}</p>
    </article>
  );
}
