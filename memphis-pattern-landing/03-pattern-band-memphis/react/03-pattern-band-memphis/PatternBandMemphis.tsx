import type { CSSProperties } from "react";
import styles from "./PatternBandMemphis.module.scss";

export type PatternBandMemphisProps = {
  /** 판 이름 3개 (점 · 물결 · 십자 순서로 무늬가 고정) */
  names?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 데모 무대 색(참고용 — 판 배경은 고정) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PatternBandMemphis({
  names = ["점", "물결", "십자"],
  duration = 2000,
  easing = "linear",
  color = "#2ec4a6",
}: PatternBandMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  /* 무늬는 순서대로 고정 — 점 · 물결 · 십자 */
  const fills = [
    [styles.panelDots, styles.fillDots],
    [styles.panelWave, styles.fillWave],
    [styles.panelCross, styles.fillCross],
  ];

  return (
    <section className={styles.bandm} style={vars}>
      {names.map((n, i) => {
        const [panel, fill] = fills[i % fills.length];
        return (
          <article key={n} className={`${styles.panel} ${panel}`}>
            <div className={`${styles.fill} ${fill}`} aria-hidden="true" />
            <span className={styles.name}>{n}</span>
          </article>
        );
      })}
    </section>
  );
}
