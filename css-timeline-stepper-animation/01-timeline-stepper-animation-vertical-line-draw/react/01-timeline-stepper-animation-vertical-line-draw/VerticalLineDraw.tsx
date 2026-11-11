import { CSSProperties } from "react";
import styles from "./VerticalLineDraw.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface VerticalLineDrawProps {
  duration?: string;
  easing?: string;
  color?: string;
  steps?: string[];
}

export default function VerticalLineDraw({
  duration = "600ms",
  easing = "ease-out",
  color = "#2f6df6",
  steps = ["기획", "디자인", "개발", "출시"],
}: VerticalLineDrawProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <ul className={styles.timeline} style={style}>
      {steps.map((s) => (
        <li key={s} className={styles.step}>
          <span className={styles.dot} />
          {s}
        </li>
      ))}
      <li className={styles.line} aria-hidden="true" />
    </ul>
  );
}
