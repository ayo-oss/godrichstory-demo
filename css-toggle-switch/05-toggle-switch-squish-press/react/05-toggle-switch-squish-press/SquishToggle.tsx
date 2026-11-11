import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./SquishToggle.module.scss";

export type SquishToggleProps = {
  label?: string;
  /** 눌림 트랜지션 시간 (기본 140ms) */
  duration?: number;
  /** 팝 이징 */
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SquishToggle({
  label = "진동 피드백",
  duration = 140,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  defaultChecked = false,
  onChange,
}: SquishToggleProps) {
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
        <span className={styles["switch__bg--off"]} />
        <span className={styles["switch__bg--on"]} />
        <span className={styles.switch__knob} />
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
