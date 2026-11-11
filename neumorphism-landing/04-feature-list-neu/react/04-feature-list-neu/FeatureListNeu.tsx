import type { CSSProperties } from "react";
import styles from "./FeatureListNeu.module.scss";

export type FeatureListNeuProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FeatureListNeu({
  items = ["빠른 시작", "자동 백업", "실시간 공유"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: FeatureListNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.list} style={vars}>
      {items.map((label, i) => (
        <li key={label} className={styles.row} style={{ animationDelay: `${-i * 0.6}s` }}>
          <span className={styles.chip} aria-hidden="true" />
          <span className={styles.text}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
