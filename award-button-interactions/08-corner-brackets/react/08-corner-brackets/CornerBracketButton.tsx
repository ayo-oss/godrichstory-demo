import type { CSSProperties } from "react";
import styles from "./CornerBracketButton.module.scss";

export type CornerBracketButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const corners = ["tl", "tr", "bl", "br"] as const;

export default function CornerBracketButton({
  label = "Open settings",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: CornerBracketButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.brk} style={vars}>
      {corners.map((c) => (
        <span key={c} className={`${styles.c} ${styles[c]}`} aria-hidden="true" />
      ))}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
