import { CSSProperties, useState } from "react";
import styles from "./StackShuffle.module.scss";

export interface StackShuffleProps {
  duration?: string;
  easing?: string;
  cards?: string[];
}

export default function StackShuffle({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  cards = ["★★★★★", "★★★★☆", "★★★☆☆"],
}: StackShuffleProps) {
  const [order, setOrder] = useState(cards);
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  const shuffle = () => setOrder((o) => [...o.slice(1), o[0]]);
  return (
    <div className={styles.stack} style={style} onClick={shuffle}>
      {order.map((text, i) => (
        <div
          key={text}
          className={`${styles.card} ${i === 0 ? styles.top : ""}`}
          style={{ transform: `translateZ(${-16 * i}px) translateY(${8 * i}px)`, opacity: 1 - i * 0.18 }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}
