import type { CSSProperties } from "react";
import styles from "./FloatingLabelInput.module.scss";

export type FloatingLabelInputProps = {
  id: string;
  label: string;
  type?: string;
  /** 라벨이 뜨는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

/** :placeholder-shown 과 :focus 만으로 동작 — JS 없이 라벨이 뜬다 */
export default function FloatingLabelInput({
  id,
  label,
  type = "text",
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: FloatingLabelInputProps) {
  const style = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.field} style={style}>
      <input className={styles.input} id={id} type={type} placeholder=" " />
      <label className={styles.label} htmlFor={id}>{label}</label>
    </div>
  );
}
