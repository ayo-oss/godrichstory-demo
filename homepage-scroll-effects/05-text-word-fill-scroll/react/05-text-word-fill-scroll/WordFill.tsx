import type { CSSProperties } from "react";
import styles from "./WordFill.module.scss";

export type WordFillProps = {
  duration?: number;
  easing?: string;
  color?: string;
  words?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function WordFill({
  duration = 300,
  easing = "linear",
  color = "#2f6df6",
  words = ["스크롤이", "닿는", "곳마다", "한", "단어씩", "선명해집니다"],
}: WordFillProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.wf} style={vars}>
      {/* 단어마다 자기 자신의 view() 타임라인 — 지오메트리가 저절로 스태거를 만든다 */}
      <div className={styles.scroll}>
        <div className={styles.spacer} />
        <p className={styles.line}>
          {words.map((w, i) => (
            <span key={i} className={styles.w}>
              {w}
              {i === 2 ? <br /> : " "}
            </span>
          ))}
        </p>
        <div className={styles.spacer} />
      </div>
    </div>
  );
}
