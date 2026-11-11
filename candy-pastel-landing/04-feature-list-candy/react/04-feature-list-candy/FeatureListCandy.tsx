import type { CSSProperties } from "react";
import styles from "./FeatureListCandy.module.scss";

export type FeatureListCandyProps = {
  items?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CANDY = ["a", "b", "c", "d"] as const;

export default function FeatureListCandy({
  items = ["끌어다 놓기", "템플릿 고르기", "색 바꾸기", "공유하기"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffb9cf",
}: FeatureListCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.listcandy} style={vars}>
      {items.map((label, i) => (
        <li key={label} className={styles.row}>
          <span className={`${styles.candy} ${styles[CANDY[i % 4]]}`} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
