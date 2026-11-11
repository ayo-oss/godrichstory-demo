import type { CSSProperties } from "react";
import styles from "./SplitTextButton.module.scss";

export type SplitTextButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  stagger?: number;
};

type CellVars = CSSProperties & { "--i"?: number };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--stagger"?: string };

export default function SplitTextButton({
  label = "See details",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  stagger = 70,
}: SplitTextButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--stagger": `${stagger}ms` };
  const chars = label.split("");

  return (
    <button type="button" className={styles.split} style={vars} aria-label={label}>
      <span className={styles.inner} aria-hidden="true">
        {chars.map((ch, i) => {
          const cell: CellVars = { "--i": i };
          return (
            <span className={styles.ch} style={cell} key={`${ch}-${i}`}>
              <b className={styles.roll}>
                <i>{ch === " " ? " " : ch}</i>
                <i>{ch === " " ? " " : ch}</i>
              </b>
            </span>
          );
        })}
      </span>
    </button>
  );
}
