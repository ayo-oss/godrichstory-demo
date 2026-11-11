import type { CSSProperties, ReactNode } from "react";
import styles from "./ExplodedParts.module.scss";

export type ExplodedPartsProps = {
  parts?: string[];
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconCpu = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M200 48H56a8 8 0 0 0-8 8v144a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8m-48 104h-48v-48h48Z" opacity=".2"/><path d="M152 96h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8m-8 48h-32v-32h32Zm88 0h-16v-32h16a8 8 0 0 0 0-16h-16V56a16 16 0 0 0-16-16h-40V24a8 8 0 0 0-16 0v16h-32V24a8 8 0 0 0-16 0v16H56a16 16 0 0 0-16 16v40H24a8 8 0 0 0 0 16h16v32H24a8 8 0 0 0 0 16h16v40a16 16 0 0 0 16 16h40v16a8 8 0 0 0 16 0v-16h32v16a8 8 0 0 0 16 0v-16h40a16 16 0 0 0 16-16v-40h16a8 8 0 0 0 0-16m-32 56H56V56h144z"/></g></svg>
);

export default function ExplodedParts({
  parts = ["Top plate", "Board", "Frame", "Base plate"],
  preview = true,
  duration = 1000,
  easing = "cubic-bezier(.5, 0, .5, 1)",
  color = "#17141a",
}: ExplodedPartsProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.ex} ${styles.isDemo}` : styles.ex;

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <div className={styles.pin}>
            <div className={styles.stack}>
              {parts.map((p: string, i: number): ReactNode => (
                <div className={`${styles.part} ${styles[`part${i + 1}`]}`} key={p}>
                  {i === 1 ? <IconCpu /> : null}
                  <span className={styles.tag}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
