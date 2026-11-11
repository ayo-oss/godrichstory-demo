import { CSSProperties } from "react";
import styles from "./CtaGlow.module.scss";

export interface CtaGlowProps {
  duration?: string;
  easing?: string;
  label?: string;
}

export default function CtaGlow({
  duration = "1.8s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  label = "Get started",
}: CtaGlowProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <button className={styles.btn} style={style} type="button">
      {label}
    </button>
  );
}
