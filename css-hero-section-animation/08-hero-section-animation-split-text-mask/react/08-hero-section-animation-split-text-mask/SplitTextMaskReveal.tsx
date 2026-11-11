import type { CSSProperties } from "react";
import styles from "./SplitTextMaskReveal.module.scss";

export type SplitTextMaskRevealProps = {
  text?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SplitTextMaskReveal({
  text = "Type less. Ship more.",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: SplitTextMaskRevealProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.headline} style={vars}>
      <h1 className={styles.mask}>{text}</h1>
      <span className={styles.underline} aria-hidden="true" />
    </div>
  );
}
