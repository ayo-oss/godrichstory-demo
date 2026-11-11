import type { CSSProperties, ReactNode } from "react";
import styles from "./DataBarsGrow.module.scss";

export type DataBarsGrowProps = {
  caption?: string;
  labels?: string[];
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DataBarsGrow({
  caption = "Return visits",
  labels = ["Q1", "Q2", "Q3", "Q4", "Q5"],
  preview = true,
  duration = 2000,
  easing = "cubic-bezier(.5, 0, .5, 1)",
  color = "#4cd4a6",
}: DataBarsGrowProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.db} ${styles.isDemo}` : styles.db;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <p className={styles.cap}>{caption}</p>
          <div className={styles.chart}>
            {labels.map((l: string): ReactNode => (
              <div className={styles.col} key={l}>
                <span className={styles.bar} />
                <span className={styles.axis}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
