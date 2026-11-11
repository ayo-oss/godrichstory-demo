import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./OnOffToggle.module.scss";

export type OnOffToggleProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function OnOffToggle({
  label = "공개 상태",
  duration = 300,
  easing = "cubic-bezier(0.34, 1.56, 0.64, 1)",
  color = "#fff7e6",
  defaultChecked = false,
  onChange,
}: OnOffToggleProps) {
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
        <span className={styles["switch__text--on"]}>ON</span>
        <span className={styles["switch__text--off"]}>OFF</span>
        <span className={styles.switch__knob} />
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
