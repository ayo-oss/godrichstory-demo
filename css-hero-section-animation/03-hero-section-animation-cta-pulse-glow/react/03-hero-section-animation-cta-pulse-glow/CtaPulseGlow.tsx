import type { CSSProperties } from "react";
import styles from "./CtaPulseGlow.module.scss";

export type CtaPulseGlowProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaPulseGlow({
  label = "Get started",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: CtaPulseGlowProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.cta} style={vars}>
      {label}
    </button>
  );
}
