import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SponsorLogoBar.module.scss";

const SHAPES = ["circle", "diamond", "triangle", "pill"] as const;

export type SponsorLogoBarProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SponsorLogoBar({ duration = 14000, easing = "linear", color = "#17141a" }: SponsorLogoBarProps) {
  const [paused, setPaused] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const logos = [...SHAPES, ...SHAPES];

  return (
    <section className={styles.sb} style={vars} aria-label="스폰서 로고">
      <p className={styles.label}>SPONSORED BY</p>
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
