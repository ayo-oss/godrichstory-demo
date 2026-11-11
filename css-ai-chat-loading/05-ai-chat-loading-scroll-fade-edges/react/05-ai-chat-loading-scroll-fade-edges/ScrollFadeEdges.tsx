import { CSSProperties } from "react";
import styles from "./ScrollFadeEdges.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ScrollFadeEdgesProps {
  duration?: string;
  easing?: string;
  color?: string;
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  "Here's the summary you asked for.",
  "Let me check the docs first.",
  "Found three matching results.",
  "Comparing the two approaches now.",
];

export default function ScrollFadeEdges({
  duration = "6s",
  easing = "linear",
  color = "#17141a",
  messages = DEFAULT_MESSAGES,
}: ScrollFadeEdgesProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  const doubled = [...messages, ...messages];
  return (
    <div className={styles.viewport} style={style}>
      <div className={styles.track}>
        {doubled.map((m, i) => (
          <div className={styles.msg} key={i}>{m}</div>
        ))}
      </div>
    </div>
  );
}
