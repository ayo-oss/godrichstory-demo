import type { CSSProperties } from "react";
import styles from "./FadeEdgeMarquee.module.scss";

export type FadeEdgeMarqueeProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FadeEdgeMarquee({
  items = ["01", "02", "03", "04", "05"],
  duration = 12000,
  easing = "linear",
  color = "#17141a",
}: FadeEdgeMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars}>
      <div className={styles.track}>
        {items.map((it) => (
          <span key={it} className={styles.chip}>{it}</span>
        ))}
        {items.map((it) => (
          <span key={"dup-" + it} className={styles.chip} aria-hidden="true">{it}</span>
        ))}
      </div>
    </div>
  );
}
