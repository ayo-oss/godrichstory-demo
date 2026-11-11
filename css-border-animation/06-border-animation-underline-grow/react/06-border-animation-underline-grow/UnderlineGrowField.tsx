import type { CSSProperties } from "react";
import styles from "./UnderlineGrowField.module.scss";

export type UnderlineGrowFieldProps = {
  label: string;
  placeholder: string;
  /** 실제 포커스 시 밑줄이 벌어지는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 밑줄 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function UnderlineGrowField({
  label,
  placeholder,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: UnderlineGrowFieldProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const id = "field-" + label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={styles.field} style={vars}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input className={styles.input} id={id} type="text" placeholder={placeholder} />
      <span className={styles.bar} aria-hidden="true" />
    </div>
  );
}
