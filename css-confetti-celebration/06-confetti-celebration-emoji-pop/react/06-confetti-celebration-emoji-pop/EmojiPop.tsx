import { CSSProperties, useState } from "react";
import styles from "./EmojiPop.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface EmojiPopProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const EMOJI = ["🎉", "✨", "🎊"];

export default function EmojiPop({
  duration = "700ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: EmojiPopProps) {
  const [popKey, setPopKey] = useState(0);
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={style}>
      <button className={styles.btn} type="button" onClick={() => setPopKey((k) => k + 1)}>
        👏 응원하기
      </button>
      <span key={popKey} className={styles.emojis}>
        {EMOJI.map((e, i) => (
          <span
            key={i}
            className={styles.emoji}
            style={{ left: `${10 + i * 34}%`, animationDelay: `${i * 110}ms` } as Vars}
          >
            {e}
          </span>
        ))}
      </span>
    </div>
  );
}
