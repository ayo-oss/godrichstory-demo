import { CSSProperties } from "react";
import styles from "./StreamingCaret.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface StreamingCaretProps {
  duration?: string;
  easing?: string;
  color?: string;
  text?: string;
  tail?: string;
}

export default function StreamingCaret({
  duration = "530ms",
  easing = "steps(1)",
  color = "#fff7e6",
  text = "The border light rotates once around ",
  tail = "the card",
}: StreamingCaretProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line} style={style}>
      {text}
      <span className={styles.tail}>{tail}</span>
      <span className={styles.caret} />
    </p>
  );
}
