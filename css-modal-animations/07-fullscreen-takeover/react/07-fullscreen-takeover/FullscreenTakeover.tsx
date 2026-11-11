import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullscreenTakeover.module.scss";

export type FullscreenTakeoverProps = {
  caption: string;
  /** 커지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FullscreenTakeover({
  caption,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: FullscreenTakeoverProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <button
        type="button"
        className={open ? `${styles.thumb} ${styles.isOpen}` : styles.thumb}
        aria-label={caption}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.caption}>{caption}</span>
        <span className={styles.close} aria-hidden="true">×</span>
      </button>
    </div>
  );
}
