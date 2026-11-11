import type { CSSProperties } from "react";
import styles from "./PressableKey.module.scss";

export type PressableKeyProps = {
  label?: string;
  caption?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PressableKey({
  label = "시작하기",
  caption = "8px 내려앉고 벽이 줄어든다",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PressableKeyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.physkey} style={vars}>
      <div className={styles.well}>
        <span className={styles.wall} aria-hidden="true" />
        <button type="button" className={styles.cap}>
          <span className={styles.label}>{label}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2"/><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z"/></g></svg>
        </button>
      </div>
      <p className={styles.caption}>{caption}</p>
    </section>
  );
}
