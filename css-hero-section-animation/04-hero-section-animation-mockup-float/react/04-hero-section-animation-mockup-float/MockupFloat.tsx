import type { CSSProperties } from "react";
import styles from "./MockupFloat.module.scss";

export type MockupFloatProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MockupFloat({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MockupFloatProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.mockup} style={vars}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dotMuted} />
        <span className={styles.dotMuted} />
      </div>
      <div className={styles.body} aria-hidden="true">
        <span className={`${styles.block} ${styles.blockLg}`} />
        <span className={`${styles.block} ${styles.blockSm}`} />
      </div>
    </div>
  );
}
