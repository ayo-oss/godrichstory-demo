import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BarDrilldown.module.scss";

// 월 막대 드릴다운 React 판 — vanilla(run/264/demo/04) 와 같은 동작.
// 화면을 갈아 끼우지 않는다: 일별 5개는 처음부터 월 막대 자리에 겹쳐 있고
// 열림은 aria-expanded 하나로 CSS transform 만 갈아끼운다.
export type BarDrilldownProps = {
  title?: string;
  totalLabel?: string;
  unit?: string;
  backLabel?: string;
  monthLabels?: string[];
  monthTotals?: number[];
  dayValues?: number[][];      // [달][일]
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
type DayVars = CSSProperties & { "--h"?: string; "--i"?: string };
type BarVars = CSSProperties & { "--h"?: string };

export default function BarDrilldown({
  title = "월간 주문",
  totalLabel = "합계",
  unit = "건",
  backLabel = "되돌리기",
  monthLabels = ["7월", "8월", "9월", "10월", "11월", "12월"],
  monthTotals = [80, 82, 78, 91, 70, 85],
  dayValues = [
    [14, 18, 12, 20, 16],
    [16, 14, 19, 15, 18],
    [12, 17, 21, 13, 15],
    [19, 15, 17, 22, 18],
    [15, 12, 16, 14, 13],
    [17, 20, 14, 18, 16],
  ],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BarDrilldownProps) {
  const [demo, setDemo] = useState(true);
  const [open, setOpen] = useState(-1);
  const axisMax = Math.max(...monthTotals);
  const grand = monthTotals.reduce((a, b) => a + b, 0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(i: number) {
    setDemo(false);
    setOpen((cur) => (cur === i ? -1 : i));
  }

  return (
    <figure
      className={`${styles.dd} ${demo ? styles.isDemo : ""}`}
      data-open={open >= 0 ? String(open) : undefined}
      style={vars}
    >
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.right}>
          <button
            type="button"
            className={styles.back}
            aria-label={backLabel}
            disabled={open < 0}
            onClick={() => {
              setDemo(false);
              setOpen(-1);
            }}
          >
            <svg className={styles.bic} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path d="M160 48v160l-80-80Z" opacity=".2" />
                <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
              </g>
            </svg>
            <span className={styles.btext}>{backLabel}</span>
          </button>
          <span className={styles.val}>
            <span className={styles.lab}>{totalLabel}</span>{" "}
            <span aria-live="polite">
              {open < 0 ? `${grand}${unit}` : `${monthLabels[open]} · ${monthTotals[open]}${unit}`}
            </span>
          </span>
        </span>
      </figcaption>
      <div
        className={styles.plot}
        role="img"
        aria-label="월간 주문 막대 그래프. 10월 91건이 가장 높고 11월 70건이 가장 낮다"
      >
        <div className={styles.cols}>
          {monthLabels.map((m, mi) => (
            <button
              key={m}
              type="button"
              className={styles.col}
              data-m={mi}
              aria-expanded={mi === open}
              onClick={() => pick(mi)}
            >
              <span className={styles.spot}>
                {dayValues[mi].map((d, di) => (
                  <i
                    key={di}
                    className={styles.day}
                    style={{ "--h": `${((d / axisMax) * 100).toFixed(1)}%`, "--i": String(di) } as DayVars}
                  />
                ))}
                <i
                  className={styles.month}
                  style={{ "--h": `${((monthTotals[mi] / axisMax) * 100).toFixed(1)}%` } as BarVars}
                />
              </span>
              <span className={styles.mlab}>{m}</span>
            </button>
          ))}
        </div>
      </div>
      <p className={styles.hint}>막대를 누르면 그 달이 제자리에서 일별로 벌어집니다</p>
    </figure>
  );
}
