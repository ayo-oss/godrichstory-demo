import { CSSProperties } from "react";
import styles from "./HorizontalStepsFill.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface HorizontalStepsFillProps {
  duration?: string;
  easing?: string;
  color?: string;
  labels?: string[];
  doneCount?: number;
}

export default function HorizontalStepsFill({
  duration = "600ms",
  easing = "ease-out",
  color = "#17141a",
  labels = ["가입", "프로필", "완료"],
  doneCount = 2,
}: HorizontalStepsFillProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.steps} style={style}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: "contents" }}>
          <div className={styles.step}>
            <span className={`${styles.circle} ${i < doneCount ? styles.done : ""}`}>{i + 1}</span>
            <span>{label}</span>
          </div>
          {i < labels.length - 1 && (
            <span className={styles.bar}>
              <span className={`${styles.fill} ${i < doneCount - 1 ? styles.filled : ""}`} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
