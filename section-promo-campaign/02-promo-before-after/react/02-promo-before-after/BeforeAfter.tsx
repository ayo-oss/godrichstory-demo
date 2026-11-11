import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BeforeAfter.module.scss";

export type BeforeAfterProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Panel = "before" | "after";

export default function BeforeAfter({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: BeforeAfterProps) {
  const [active, setActive] = useState<Panel>("before");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ba} style={vars}>
      <div className={styles.toggle} role="group" aria-label="비교 보기">
        <button type="button" className={styles.btn} aria-pressed={active === "before"} onClick={() => setActive("before")}>Before</button>
        <button type="button" className={styles.btn} aria-pressed={active === "after"} onClick={() => setActive("after")}>After</button>
      </div>
      <div className={styles.frame}>
        <div className={`${styles.panel} ${styles.before} ${active === "before" ? styles.active : ""}`}>
          <span className={styles.badge}>이전</span>
          <span className={styles.shape} />
        </div>
        <div className={`${styles.panel} ${styles.after} ${active === "after" ? styles.active : ""}`}>
          <span className={`${styles.badge} ${styles.badgeAfter}`}>이후</span>
          <span className={`${styles.shape} ${styles.shapeAfter}`} />
        </div>
        <span className={styles.shimmer} aria-hidden="true" />
      </div>
    </section>
  );
}
