import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectSkillsStack.module.scss";

export type ProjectSkillsStackProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const SHAPES = [1, 2, 3, 4, 1, 2, 3, 4];

export default function ProjectSkillsStack({ duration = 13, easing = "linear", color = "#17141a" }: ProjectSkillsStackProps) {
  const [paused, setPaused] = useState(false);
  const vars: Vars = { "--duration": `${duration}s`, "--easing": easing, "--color": color };

  return (
    <section className={`${styles.sk} ${paused ? styles.paused : ""}`} style={vars} aria-label="기술 스택">
      <p className={styles.label}>SKILLS</p>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {SHAPES.map((n, i) => (
            <span key={i} className={`${styles.chip} ${styles[`chip${n}`]}`} aria-hidden="true" />
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
