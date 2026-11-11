import { useState, type CSSProperties, type ChangeEvent } from "react";
import styles from "./TapCheckbox.module.scss";

export type TapCheckboxProps = {
  label: string;
  /** 같은 페이지에 여러 개 둘 때 겹치지 않게 */
  id?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TapCheckbox({
  label,
  id = "tap-checkbox",
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: TapCheckboxProps) {
  const [checked, setChecked] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <label className={styles.cb} style={vars} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        <svg className={styles.check} viewBox="0 0 24 24"><path d="M4 12l6 6L20 6" /></svg>
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
