import type { CSSProperties } from "react";
import styles from "./ButtonsInputsClay.module.scss";

export type ButtonsInputsClayProps = {
  buttonLabel?: string;
  placeholder?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsClay({
  buttonLabel = "저장하기",
  placeholder = "이름을 입력하세요",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: ButtonsInputsClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.ui} style={vars}>
      <button type="button" className={styles.btn}>{buttonLabel}</button>
      <label className={styles.field}>
        <input className={styles.input} type="text" placeholder={placeholder} readOnly />
      </label>
    </div>
  );
}
