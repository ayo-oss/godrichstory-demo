import type { CSSProperties } from "react";
import styles from "./BadgeNewRibbon.module.scss";

export type BadgeNewRibbonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function BadgeNewRibbon({
  duration = 2000,
  easing = "ease-out",
  color = "#16a34a",
  label = "NEW",
}: BadgeNewRibbonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.card} style={vars} aria-label="new arrival">
      <div className={styles.thumb} />
      <div className={styles.ribbonWrap}>
        <span className={styles.ribbon}>{label}</span>
      </div>
    </div>
  );
}
