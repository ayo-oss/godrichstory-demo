import type { CSSProperties } from "react";
import styles from "./FeatureListChrome.module.scss";

export type FeatureListChromeProps = {
  items?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FeatureListChrome({
  items = ["One-click deploy", "Auto save", "Live co-editing"],
  duration = 2000,
  easing = "steps(8, jump-none)",
  color = "#2f6df6",
}: FeatureListChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.list} style={vars}>
      {items.map((text) => (
        <li key={text} className={styles.row}>
          <span className={styles.icon} aria-hidden="true" />
          <p className={styles.text}>{text}</p>
        </li>
      ))}
    </ul>
  );
}
