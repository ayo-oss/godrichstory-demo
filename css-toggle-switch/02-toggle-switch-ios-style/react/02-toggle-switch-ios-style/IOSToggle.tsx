import { useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import styles from "./IOSToggle.module.scss";

export type IOSToggleProps = {
  label?: string;
  /** 도착 지점 트랜지션 시간 (기본 600ms) */
  duration?: number;
  /** 스프링 이징 */
  easing?: string;
  color?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IOSToggle({
  label = "자동 잠금",
  duration = 600,
  easing = "cubic-bezier(0.34, 1.56, 0.64, 1)",
  color = "#2f6df6",
  defaultChecked = false,
  onChange,
}: IOSToggleProps) {
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
