import type { CSSProperties } from "react";
import styles from "./DualDirectionMarquee.module.scss";

export type DualDirectionMarqueeProps = {
  forward?: string[];
  reverse?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function Row({ items, reverse }: { items: string[]; reverse?: boolean }) {
  return (
    <div className={styles.row}>
      <div className={reverse ? `${styles.track} ${styles.reverse}` : styles.track}>
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

export default function DualDirectionMarquee({
  forward = ["DESIGN", "MOTION", "LAYOUT"],
  reverse = ["CSS", "SCSS", "REACT"],
  duration = 12000,
  easing = "linear",
  color = "#17141a",
}: DualDirectionMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars}>
      <Row items={forward} />
      <Row items={reverse} reverse />
    </div>
  );
}
