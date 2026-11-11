import type { CSSProperties } from "react";
import styles from "./FocusRingField.module.scss";

export type FocusRingFieldProps = {
  label: string;
  placeholder: string;
  /** 실제 포커스 시 링이 벌어지는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 링 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FocusRingField({
  label,
  placeholder,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: FocusRingFieldProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const id = "focus-" + label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={styles.field} style={vars}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input className={styles.input} id={id} type="text" placeholder={placeholder} />
    </div>
  );
}
