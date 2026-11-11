import type { CSSProperties } from "react";
import styles from "./AuroraFeatureList.module.scss";

export type AuroraFeatureListProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraFeatureList({
  items = ["Fast deploys", "Auto backups", "Real-time collaboration"],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: AuroraFeatureListProps) {
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
