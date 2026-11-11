import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpotlightButton.module.scss";

export type SpotlightButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--mx"?: string };

export default function SpotlightButton({
  label = "See pricing",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: SpotlightButtonProps) {
  const [mx, setMx] = useState<string | null>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  if (mx) { vars["--mx"] = mx; }

  function move(e: PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setMx(`${((e.clientX - r.left) / r.width) * 100}%`);
  }

  return (
    <button
      type="button"
      className={`${styles.spot} ${mx ? "" : styles.loop}`}
      style={vars}
      onPointerMove={move}
      onPointerLeave={() => setMx(null)}
    >
      <span className={styles.label}>{label}</span>
    </button>
  );
}
