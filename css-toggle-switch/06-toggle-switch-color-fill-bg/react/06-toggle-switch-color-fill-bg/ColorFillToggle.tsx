import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./ColorFillToggle.module.scss";

export type ColorFillToggleProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ColorFillToggle({
  label = "프리미엄 플랜",
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
  defaultChecked = false,
  onChange,
}: ColorFillToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.switch} style={vars}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className={styles.switch__input}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setChecked(e.target.checked); onChange?.(e.target.checked); }}
      />
      <span className={styles.switch__track}>
        <span className={styles.switch__fill} />
        <span className={styles.switch__knob} />
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
