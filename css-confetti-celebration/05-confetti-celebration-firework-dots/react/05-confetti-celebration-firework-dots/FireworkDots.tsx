import { CSSProperties } from "react";
import styles from "./FireworkDots.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface FireworkDotsProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLORS = ["var(--color)", "#2f6df6", "#ff4d1f", "#fff7e6"];

export default function FireworkDots({
  duration = "1s",
  easing = "ease-out",
  color = "#ffd23f",
}: FireworkDotsProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={style}>
      {Array.from({ length: 8 }, (_, i) => {
        const dotStyle: Vars = {
          background: COLORS[i % COLORS.length],
          "--angle": `${(i + 1) * 45}deg`,
        };
        return <span key={i} className={styles.dot} style={dotStyle} />;
      })}
    </div>
  );
}
