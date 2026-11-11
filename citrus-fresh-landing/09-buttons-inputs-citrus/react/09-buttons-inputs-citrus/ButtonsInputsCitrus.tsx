import type { CSSProperties } from "react";
import styles from "./ButtonsInputsCitrus.module.scss";

export type ButtonsInputsCitrusProps = {
  buttonLabel?: string;
  fieldLabel?: string;
  placeholder?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsCitrus({
  buttonLabel = "저장하기",
  fieldLabel = "이메일",
  placeholder = "이메일을 적어보세요",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff6a00",
}: ButtonsInputsCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ctrlcitrus} style={vars}>
      <button type="button" className={styles.btn}>{buttonLabel}</button>
      <label className={styles.field}>
        <span className={styles.label}>{fieldLabel}</span>
        <input className={styles.input} type="email" placeholder={placeholder} />
      </label>
    </div>
  );
}
