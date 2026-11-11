import { CSSProperties } from "react";
import styles from "./BubblePopIn.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface BubblePopInProps {
  duration?: string;
  easing?: string;
  color?: string;
  text?: string;
}

export default function BubblePopIn({
  duration = "2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#0a4fe8",
  text = "Here's the summary you asked for.",
}: BubblePopInProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.bubble} style={style}>
      {text}
    </div>
  );
}
