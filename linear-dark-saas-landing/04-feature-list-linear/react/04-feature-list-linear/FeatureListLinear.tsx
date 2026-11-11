import type { CSSProperties } from "react";
import styles from "./FeatureListLinear.module.scss";

export type FeatureListLinearProps = {
  rows?: [string, string, string];
  /** 줄 하나가 스치듯 나타났다 사라지는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FeatureListLinear({
  rows = ["실시간 협업 편집", "키보드 전용 커맨드바", "버전별 변경 로그"],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FeatureListLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = ["0s", `${-duration * 0.67}ms`, `${-duration * 0.34}ms`];

  return (
    <ul className={styles.list} style={vars}>
      {rows.map((text, i) => (
        <li key={text} className={styles.row} style={{ animationDelay: delays[i] }}>
          <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
          <span className={styles.text}>{text}</span>
        </li>
      ))}
    </ul>
  );
}
