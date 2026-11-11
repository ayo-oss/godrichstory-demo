import type { CSSProperties, ReactNode } from "react";
import styles from "./FrameSequenceScrub.module.scss";

export type FrameSequenceScrubProps = {
  frames?: number;
  hint?: string;
  preview?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type FrameVars = CSSProperties & { "--i"?: number };

export default function FrameSequenceScrub({
  frames = 8,
  hint = "Each bit of scroll advances one frame.",
  preview = true,
  duration = 1000,
  easing = "linear",
  color = "#fff7e6",
}: FrameSequenceScrubProps): ReactNode {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = preview ? `${styles.sp} ${styles.isDemo}` : styles.sp;
  const list: number[] = [];
  for (let i = 0; i < frames; i += 1) list.push(i);

  return (
    <div className={cls} style={vars}>
      <div className={styles.scroller}>
        <div className={styles.pad}>
          <div className={styles.pin}>
            <div className={styles.window}>
              <div className={styles.strip} aria-hidden="true">
                {list.map((i: number): ReactNode => {
                  const fv: FrameVars = { "--i": i };
                  return (
                    <div className={styles.frame} style={fv} key={i}>
                      <span className={styles.item} />
                      <span className={styles.lid} />
                      <span className={styles.box} />
                    </div>
                  );
                })}
              </div>
            </div>
            <p className={styles.hint}>{hint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
