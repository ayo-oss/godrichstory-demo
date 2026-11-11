import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LegendToggle.module.scss";

// 범례 토글 React 판 — vanilla(run/264/demo/02) 와 같은 동작.
// 상태는 pressed 배열 하나뿐: 파생값(축 최댓값·막대 높이)은 전부 렌더마다 다시 계산한다.
export type LegendToggleProps = {
  title?: string;
  axisLabel?: string;
  unit?: string;
  seriesLabels?: string[];
  monthLabels?: string[];
  values?: number[][];        // [계열][달]
  duration?: number;          // ms — --duration 으로 transition 에 전달
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--b"?: string; "--h"?: string };

export default function LegendToggle({
  title = "채널별 유입",
  axisLabel = "축 최대",
  unit = "명",
  seriesLabels = ["검색", "직접", "추천"],
  monthLabels = ["3월", "4월", "5월", "6월"],
  values = [[420, 380, 460, 440], [240, 260, 200, 250], [150, 190, 130, 170]],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LegendToggleProps) {
  const [demo, setDemo] = useState(true);
  const [pressed, setPressed] = useState<boolean[]>([true, true, true]);

  const onIdx = pressed.map((p, k) => (p ? k : -1)).filter((k) => k >= 0);
  const axisMax = onIdx.length
    ? Math.max(...onIdx.flatMap((k) => values[k]))
    : 0;                       // 전부 꺼면 0 — 막대는 바닥(0%)으로
  const fullMax = Math.max(...values.flat());   // 처음 축(전 계열 최댓값) 기준 백분율

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(i: number) {
    setDemo(false);
    setPressed((prev) => prev.map((p, k) => (k === i ? !p : p)));
  }

  return (
    <figure className={`${styles.lg} ${demo ? styles.isDemo : ""}`} style={vars}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sum}>
          <span className={styles.lab}>{axisLabel}</span>{" "}
          <span className={styles.val} aria-live="polite">
            {axisMax}
            {unit}
          </span>
        </span>
      </figcaption>
      <div
        className={styles.plot}
        role="img"
        aria-label="채널별 유입 막대 그래프. 검색이 가장 높고 5월 460명이 최대, 직접은 최대 260명, 추천은 최대 190명"
      >
        <div className={styles.groups}>
          {monthLabels.map((m, mi) => (
            <div className={styles.group} key={m}>
              {seriesLabels.map((s, si) => {
                const folded = !pressed[si];
                const barVars: BarVars = {
                  "--b": `${((values[si][mi] / fullMax) * 100).toFixed(1)}%`,
                  "--h": axisMax ? `${((values[si][mi] / axisMax) * 100).toFixed(1)}%` : "0%",
                };
                return (
                  <i
                    className={styles.bar}
                    key={s}
                    data-s={si}
                    data-fold={folded ? "1" : undefined}
                    style={barVars}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.axis} aria-hidden="true">
          {monthLabels.map((m) => <span key={m}>{m}</span>)}
        </div>
      </div>
      <div className={styles.chips} role="group" aria-label="보일 계열 고르기">
        {seriesLabels.map((s, si) => (
          <button
            key={s}
            type="button"
            className={styles.chip}
            data-s={si}
            aria-pressed={pressed[si]}
            onClick={() => toggle(si)}
          >
            <i className={styles.dot} aria-hidden="true" />
            {s}
          </button>
        ))}
      </div>
      <p className={styles.hint}>칩을 눌러 계열을 끄면 축이 다시 잡힙니다</p>
    </figure>
  );
}
