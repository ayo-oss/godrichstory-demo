// AsciiProgress — vanilla 판(run/294/demo/05-terminal-ascii-progress/index.html) 의 React 포트.
// 막대를 도형이 아니라 채움 문자 열여섯 개로 그린다. 채운 쪽만 clip-path 로 잘라 보여 준다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AsciiProgress.module.scss";

export type AsciiProgressProps = {
  /** 격자 미리보기용 2초 자동 루프. 다시 실행을 누르면 한 번만 채워지는 실제 실행으로 넘어간다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Mode = "demo" | "idle" | "run";
type Task = { name: string; value: number; eta: string };

/** 막대 한 줄은 채움 문자 열여섯 개 — 빈 칸과 채운 칸이 같은 격자 칸에 겹쳐 있다 */
const CELLS = "████████████████";
const TASKS: Task[] = [
  { name: "build", value: 75, eta: "0:04" },
  { name: "test", value: 50, eta: "0:11" },
  { name: "docs", value: 25, eta: "0:26" },
];
const ROW_CLASS = [styles.row1, styles.row2, styles.row3];

export default function AsciiProgress({
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#2b9d74",
}: AsciiProgressProps) {
  const [mode, setMode] = useState<Mode>(demo ? "demo" : "idle");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function runAgain() {
    // 미리보기 루프를 끄고 한 번만 채워지는 실제 실행 경로로 넘어간다.
    // 클래스를 뗐다가 다음 프레임에 다시 붙여야 같은 애니메이션이 처음부터 다시 돈다
    setMode("idle");
    requestAnimationFrame(() => { setMode("run"); });
  }

  const rootCls = [styles.pg, mode === "demo" ? styles.isDemo : "", mode === "run" ? styles.isRun : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={rootCls}>
        <p className={styles.barTop}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
                <path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" />
              </g>
            </svg>
          </span>
          <span className={styles.title}>작업 세 개</span>
          <button className={styles.again} type="button" onClick={runAgain}>다시 실행</button>
        </p>
        {TASKS.map((task, i) => (
          <p className={`${styles.row} ${ROW_CLASS[i]}`} key={task.name}>
            <span className={styles.name}>{task.name}</span>
            <span
              className={styles.meter}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={task.value}
              aria-label={task.name}
            >
              <span className={styles.brk}>[</span>
              <span className={styles.cells}>
                <span className={styles.track} aria-hidden="true">{CELLS}</span>
                <span className={styles.fill} aria-hidden="true">{CELLS}</span>
              </span>
              <span className={styles.brk}>]</span>
            </span>
            <span className={styles.pct} aria-hidden="true" />
            <span className={styles.eta}>{task.eta}</span>
          </p>
        ))}
      </div>
    </main>
  );
}
