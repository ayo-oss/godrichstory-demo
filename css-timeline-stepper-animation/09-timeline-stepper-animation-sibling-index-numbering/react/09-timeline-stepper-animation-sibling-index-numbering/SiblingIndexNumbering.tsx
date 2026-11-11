import { CSSProperties } from "react";
import styles from "./SiblingIndexNumbering.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface SiblingIndexNumberingProps {
  duration?: string;
  easing?: string;
  color?: string;
  steps?: string[];
}

export default function SiblingIndexNumbering({
  duration = "2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
  steps = ["가입", "배송", "결제", "완료"],
}: SiblingIndexNumberingProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <ul className={styles.list} style={style}>
      {steps.map((s, i) => (
        <li key={s} className={styles.step} aria-label={`${i + 1}번째 단계: ${s}`}>{s}</li>
      ))}
    </ul>
  );
}
