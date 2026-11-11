import type { CSSProperties } from "react";
import styles from "./Curved3DMarquee.module.scss";

export type Curved3DMarqueeProps = {
  count?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function Curved3DMarquee({
  count = 5,
  duration = 12000,
  easing = "linear",
  color = "#2f6df6",
}: Curved3DMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cards = Array.from({ length: count * 2 });

  return (
    <div className={styles.stage3d}>
      <div className={styles.marquee} style={vars}>
        <div className={styles.track}>
          {cards.map((_, i) => (
            <span key={i} className={styles.card} aria-hidden={i >= count} />
          ))}
        </div>
      </div>
    </div>
  );
}
