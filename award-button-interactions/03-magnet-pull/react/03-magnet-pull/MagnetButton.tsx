import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./MagnetButton.module.scss";

export type MagnetButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MagnetButton({
  label = "View projects",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MagnetButtonProps) {
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function move(e: PointerEvent<HTMLDivElement>) {
    const btn = e.currentTarget.firstElementChild as HTMLElement | null;
    if (!btn) { return; }
    const r = btn.getBoundingClientRect();
    setPull({
      x: (e.clientX - (r.left + r.width / 2)) * 0.35,
      y: (e.clientY - (r.top + r.height / 2)) * 0.35,
    });
  }

  return (
    <div className={styles.field} style={vars} onPointerMove={move} onPointerLeave={() => setPull(null)}>
      <button
        type="button"
        className={`${styles.mag} ${pull ? "" : styles.loop}`}
        style={pull ? { translate: `${pull.x}px ${pull.y}px` } : undefined}
      >
        <span
          className={`${styles.label} ${pull ? "" : styles.labelLoop}`}
          style={pull ? { translate: `${-pull.x * 0.4}px ${-pull.y * 0.4}px` } : undefined}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
