import type { CSSProperties } from "react";
import styles from "./FeatureListCrayon.module.scss";

export type FeatureListCrayonProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ITEMS = ["드래그로 배치", "색상 골라 칠하기", "손그림 아이콘 고르기", "바로 공유하기"];
const COLORS = ["#ff5a5f", "#4fa3e3", "#6dbe6d", "#a685e2"];

export default function FeatureListCrayon({
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "ease-out",
  color = "#ff5a5f",
}: FeatureListCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.list} style={vars}>
      {items.map((text, i) => (
        <li key={text} className={styles.row}>
          <svg className={styles.check} viewBox="0 0 20 16" aria-hidden="true">
            <path
              className={styles.checkPath}
              style={{ stroke: COLORS[i % COLORS.length], animationDelay: `${i * 160}ms` }}
              d="M2 9 C 3 8, 4 10, 7 13 C 10 10, 14 6, 18 2"
            />
          </svg>
          <span className={styles.text}>{text}</span>
        </li>
      ))}
    </ul>
  );
}
