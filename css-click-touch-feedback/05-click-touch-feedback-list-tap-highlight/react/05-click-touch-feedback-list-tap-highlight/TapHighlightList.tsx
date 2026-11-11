import type { CSSProperties } from "react";
import styles from "./TapHighlightList.module.scss";

export type TapHighlightListProps = {
  items: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TapHighlightList({
  items,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: TapHighlightListProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.list} style={vars}>
      {items.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
  );
}
