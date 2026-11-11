import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./SizeVariantToggle.module.scss";

export type SizeVariantToggleProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  duration?: number;
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

const SIZES = {
  sm: { track: "36px", height: "20px", knob: "14px", travel: "16px" },
  md: { track: "48px", height: "26px", knob: "20px", travel: "22px" },
  lg: { track: "60px", height: "32px", knob: "26px", travel: "28px" },
} as const;

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--track-w"?: string; "--track-h"?: string; "--knob"?: string; "--travel"?: string;
};

export default function SizeVariantToggle({
  label,
  size = "md",
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  defaultChecked = false,
  onChange,
}: SizeVariantToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const s = SIZES[size];
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color,
    "--track-w": s.track, "--track-h": s.height, "--knob": s.knob, "--travel": s.travel,
  };

  return (
    <label className={styles.switch} style={vars}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label ?? size}
        aria-checked={checked}
        className={styles.switch__input}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setChecked(e.target.checked); onChange?.(e.target.checked); }}
      />
      <span className={styles.switch__track}>
        <span className={styles["switch__bg--off"]} />
        <span className={styles["switch__bg--on"]} />
        <span className={styles.switch__knob} />
      </span>
    </label>
  );
}
