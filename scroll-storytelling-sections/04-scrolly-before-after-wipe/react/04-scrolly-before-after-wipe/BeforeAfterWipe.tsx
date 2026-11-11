import type { CSSProperties, ReactNode } from "react";
import styles from "./BeforeAfterWipe.module.scss";

export type BeforeAfterWipeProps = {
  beforeLabel?: string;
  afterLabel?: string;
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconArrows = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M208 80v96H48V80Z" opacity=".2"/><path d="m213.66 181.66l-32 32a8 8 0 0 1-11.32-11.32L188.69 184H48a8 8 0 0 1 0-16h140.69l-18.35-18.34a8 8 0 0 1 11.32-11.32l32 32a8 8 0 0 1 0 11.32m-139.32-64a8 8 0 0 0 11.32-11.32L67.31 88H208a8 8 0 0 0 0-16H67.31l18.35-18.34a8 8 0 0 0-11.32-11.32l-32 32a8 8 0 0 0 0 11.32Z"/></g></svg>
);

const Layer = ({ kind }: { kind: string }): ReactNode => (
  <div className={`${styles.layer} ${styles[kind]}`} aria-hidden="true">
    <span className={`${styles.bar} ${styles.barA}`} />
    <span className={`${styles.bar} ${styles.barB}`} />
    <span className={`${styles.bar} ${styles.barC}`} />
    <span className={styles.dot} />
  </div>
);

export default function BeforeAfterWipe({
  beforeLabel = "Before",
  afterLabel = "After",
  preview = true,
  duration = 1000,
  easing = "cubic-bezier(.65, 0, .35, 1)",
  color = "#2f6df6",
}: BeforeAfterWipeProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.bw} ${styles.isDemo}` : styles.bw;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <div className={styles.frame}>
            <Layer kind="after" />
            <Layer kind="before" />
            <div className={styles.handle} aria-hidden="true"><IconArrows /></div>
          </div>
          <p className={styles.tags}>
            <span className={`${styles.tag} ${styles.tagOld}`}>{beforeLabel}</span>
            <span className={styles.tag}>{afterLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
