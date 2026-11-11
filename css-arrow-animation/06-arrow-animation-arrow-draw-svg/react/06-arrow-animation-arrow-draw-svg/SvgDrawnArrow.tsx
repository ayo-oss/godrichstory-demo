import { CSSProperties } from "react";
import styles from "./SvgDrawnArrow.module.scss";

export interface SvgDrawnArrowProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function SvgDrawnArrow({
  duration = "2.2s",
  easing = "ease-out",
  color = "#17141a",
}: SvgDrawnArrowProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <svg className={styles.svg} viewBox="0 0 100 60" aria-hidden="true" style={style}>
      <path className={styles.pathTrail} pathLength={100} d="M10,30 L80,30 L58,10 M80,30 L58,50" />
      <path className={styles.path} pathLength={100} d="M10,30 L80,30 L58,10 M80,30 L58,50" />
      <circle className={styles.tip} cx={80} cy={30} r={3} />
    </svg>
  );
}
