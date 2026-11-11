import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressMentionsBar.module.scss";

const SHAPES = ["circle", "diamond", "triangle", "pill"] as const;

export type PressMentionsBarProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PressMentionsBar({ duration = 14000, easing = "linear", color = "#17141a" }: PressMentionsBarProps) {
  const [paused, setPaused] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const logos = [...SHAPES, ...SHAPES];

  return (
    <section className={styles.mb} style={vars} aria-label="언론 보도">
      <p className={styles.label}>AS SEEN IN</p>
      <div className={styles.viewport}>
        <div className={paused ? `${styles.track} ${styles.paused}` : styles.track}>
          {logos.map((shape, i) => (
            <span key={i} className={`${styles.logo} ${styles[shape]}`} aria-hidden="true" />
          ))}
        </div>
      </div>
      <button
        type="button"
        className={styles.pause}
        aria-pressed={paused}
        onClick={() => setPaused((v) => !v)}
      >
        흐름 멈추기
      </button>
    </section>
  );
}
