import type { CSSProperties } from "react";
import styles from "./ThreeStateToggle.module.scss";

export type ThreeStateMode = "light" | "dark" | "auto";

export type ThreeStateToggleProps = {
  mode: ThreeStateMode;
  onChange?: (mode: ThreeStateMode) => void;
  /** 인디케이터가 옮겨가는 시간 (기본 350ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MODES: ThreeStateMode[] = ["light", "dark", "auto"];

export default function ThreeStateToggle({
  mode,
  onChange,
  duration = 350,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  className = "",
}: ThreeStateToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <span className={`${styles.track} ${className}`} style={vars} data-mode={mode} role="radiogroup" aria-label="환경설정">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          className={styles.slot}
          role="radio"
          aria-checked={m === mode}
          onClick={() => onChange?.(m)}
        />
      ))}
      <span className={styles.thumb} />
    </span>
  );
}
