// BootLines — vanilla 판(run/023/demo/04-os-boot-sequence-lines/index.html) 의 React 포트.
// 점검 줄이 한 줄씩 쌓이고 결과가 한 박자 늦게 붙는다. 마지막 줄 뒤 화면이 한 번 비워지고
// 다시 센다. 화면을 누르면 key 를 바꿔 통째로 다시 마운트해 루프를 처음부터 돌린다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BootLines.module.scss";

export type BootLinesProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 React 이벤트 제네릭이 없다 — 쓰는 것만 로컬 타입으로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

const SCR_ARIA = "부팅 점검 다시 시작";
const LOGO_SUB = "부팅 점검";
const NOTE = "점검 줄이 한 줄씩 쌓이고 한 박자 늦게 결과가 붙습니다. 화면을 누르면 처음부터 다시 셉니다";
const ROWS = [
  { lab: "메모리 검사", res: "65,536 KB" },
  { lab: "주 디스크", res: "준비" },
  { lab: "키보드 연결", res: "확인" },
  { lab: "디스플레이", res: "640×480" },
  { lab: "부팅 장치", res: "OK" }
];

const CPU_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
    <g fill="currentColor">
      <path d="M200 48H56a8 8 0 0 0-8 8v144a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8V56a8 8 0 0 0-8-8m-48 104h-48v-48h48Z" opacity=".2" />
      <path d="M152 96h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8m-8 48h-32v-32h32Zm88 0h-16v-32h16a8 8 0 0 0 0-16h-16V56a16 16 0 0 0-16-16h-40V24a8 8 0 0 0-16 0v16h-32V24a8 8 0 0 0-16 0v16H56a16 16 0 0 0-16 16v40H24a8 8 0 0 0 0 16h16v32H24a8 8 0 0 0 0 16h16v40a16 16 0 0 0 16 16h40v16a8 8 0 0 0 16 0v-16h32v16a8 8 0 0 0 16 0v-16h40a16 16 0 0 0 16-16v-40h16a8 8 0 0 0 0-16m-32 56H56V56h144z" />
    </g>
  </svg>
);

export default function BootLines(props: BootLinesProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#0a4fe8";
  const [run, setRun] = useState(0);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  const restart = () => setRun((r: number) => r + 1);
  const onKeyDown = (e: KeyEvt) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      restart();
    }
  };

  return (
    <main className={styles.stage}>
      <div key={run} className={styles.root + " " + styles.isDemo} style={vars}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">{CPU_ICON}</span>
          <span className={styles.name}>GODRICH BIOS</span>
          <span className={styles.rev}>REV 2.4</span>
        </div>
        <div className={styles.scr} tabIndex={0} role="button" aria-label={SCR_ARIA}
          onClick={restart} onKeyDown={onKeyDown}>
          <div className={styles.logo} aria-hidden="true">
            <span className={styles.lg1}>GODRICH</span>
            <span className={styles.lg2}>{LOGO_SUB}</span>
          </div>
          <ul className={styles.lines}>
            {ROWS.map((row, i) => (
              <li key={i} className={styles.row + " " + styles["row" + (i + 1)]}>
                <span className={styles.lab}>{row.lab}</span>
                <span className={styles.res}>{row.res}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
