import type { CSSProperties } from "react";
import styles from "./MarqueeStrip.module.scss";

export type MarqueeStripProps = {
  label?: string;
  pills?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MarqueeStrip({
  label = "Integrates with",
  pills = ["STRIPE", "NOTION", "FIGMA", "SLACK", "LINEAR"],
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: MarqueeStripProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars}>
      <p className={styles.label}>{label}</p>
      <div className={styles.row}>
        <div className={styles.track}>
          {pills.map((p) => (
            <span key={p} className={styles.pill}>{p}</span>
          ))}
          {pills.map((p) => (
            <span key={"dup-" + p} className={styles.pill} aria-hidden="true">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
