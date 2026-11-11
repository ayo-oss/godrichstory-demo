import { CSSProperties } from "react";
import styles from "./TokenFadeWords.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface TokenFadeWordsProps {
  duration?: string;
  easing?: string;
  color?: string;
  words?: string[];
}

const DEFAULT_WORDS = ["Here's", "a", "quick", "summary", "of", "what", "changed", "today."];

export default function TokenFadeWords({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a",
  words = DEFAULT_WORDS,
}: TokenFadeWordsProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line} style={style}>
      {words.map((w, i) => (
        <span key={i} className={styles.word} style={{ animationDelay: `${i * 90}ms` }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
