import type { CSSProperties } from "react";
import styles from "./DisabledToggle.module.scss";

export type DisabledToggleProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 항상 disabled. 권한이 없을 때 그대로 두는 용도라 checked/onChange 를 받지 않는다. */
export default function DisabledToggle({
  label = "관리자 권한",
  duration = 600,
  easing = "ease-out",
  color = "#fff7e6",
}: DisabledToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <label className={styles.switch} style={vars}>
      <input type="checkbox" role="switch" aria-label={label} aria-checked={false} className={styles.switch__input} disabled />
      <span className={styles.switch__track}>
        <span className={styles.switch__bg} />
        <span className={styles.switch__knob} />
      </span>
      <span className={styles.switch__label}>{label}</span>
    </label>
  );
}
