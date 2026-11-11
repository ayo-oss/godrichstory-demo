import type { CSSProperties } from "react";
import styles from "./ThemeShift.module.scss";

export type ThemeShiftProps = {
  duration?: number;
  easing?: string;
  color?: string;
  sections?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ThemeShift({
  duration = 300,
  easing = "linear",
  color = "#2f6df6",
  sections = ["첫째 마당 · 인사", "둘째 마당 · 이야기", "셋째 마당 · 마무리"],
}: ThemeShiftProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ts} style={vars}>
      {/* 스크롤 상자의 위치가 곧 배경색 — sticky 배경이 뒤에 붙고 섹션이 앞을 지나간다 */}
      <div className={styles.scroll}>
        <div className={styles.bg} />
        {sections.map((s, i) => (
          <section key={i} className={styles.sec}>
            <span className={styles.chip}>{s}</span>
          </section>
        ))}
      </div>
    </div>
  );
}
