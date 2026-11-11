import { CSSProperties } from "react";
import styles from "./CompareColumnHighlight.module.scss";

export interface CompareColumnHighlightProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLS = [
  { tag: "Basic", price: "$9" },
  { tag: "Pro", price: "$29" },
  { tag: "Team", price: "$79" },
];

export default function CompareColumnHighlight({
  duration = "180ms",
  easing = "ease-out",
  color = "#2f6df6",
}: CompareColumnHighlightProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.table} style={style}>
      {COLS.map((c) => (
        <div key={c.tag} className={styles.col}>
          <span className={styles.tag}>{c.tag}</span>
          <span className={styles.price}>{c.price}</span>
        </div>
      ))}
    </div>
  );
}
