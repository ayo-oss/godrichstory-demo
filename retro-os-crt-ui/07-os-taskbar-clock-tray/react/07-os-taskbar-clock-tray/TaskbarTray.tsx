// TaskbarTray — vanilla 판(run/023/demo/07-os-taskbar-clock-tray/index.html) 의 React 포트.
// 오른쪽 끝 시계가 toLocaleTimeString 으로 실제 시각을 분 단위로 세고, 종 모양 알림 칸을
// 누르면 그 위로 말풍선이 오른다. 창 단추는 눌림과 올라옴에서 border-color 의 밝은 면과
// 어두운 면 방향이 서로 반대로 뒤집힌다(상태는 aria-pressed 로 CSS 가 읽는다).
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TaskbarTray.module.scss";

export type TaskbarTrayProps = {
  duration?: number;
  easing?: string;
  color?: string;
  winName?: string;
  taskA?: string;
  taskB?: string;
  balloonText?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const NOTE_A = "하단 바의 시계는 지금 시각을 분 단위로 셉니다";
const NOTE_B = "종 모양 알림을 누르면 말풍선이 뜹니다";
const CLOCK_FALLBACK = "오후 9:41";
const CLOCK_PREVIEW_1 = "오후 9:41";
const CLOCK_PREVIEW_2 = "오후 9:42";
const ARIA_ALERT = "알림";

function nowText(): string {
  const lang = document.documentElement.lang || "ko";
  return new Date().toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit" });
}

export default function TaskbarTray(props: TaskbarTrayProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#0a4fe8";
  const winName = props.winName ?? "메모장";
  const taskA = props.taskA ?? "메모장";
  const taskB = props.taskB ?? "그림판";
  const balloonText = props.balloonText ?? "업데이트가 준비되었습니다";
  const [preview, setPreview] = useState<boolean>(true);
  const [time, setTime] = useState<string>(CLOCK_FALLBACK);
  const [alertOn, setAlertOn] = useState<boolean>(false);
  const [aOn, setAOn] = useState<boolean>(true);
  const [bOn, setBOn] = useState<boolean>(false);

  useEffect(() => {
    setTime(nowText());
    const timer = window.setInterval(() => setTime(nowText()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const leave = () => setPreview(false);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={leave}
      >
        <div className={styles.desk}>
          <div className={styles.win}>
            <div className={styles.title}>
              <span className={styles.tico} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="M128 144h80v72l-80-14.55Zm-96 40l64 11.64V144H32Zm96-129.45V112h80V40ZM32 112h64V60.36L32 72Z" opacity=".2" />
                    <path d="M208 136h-80a8 8 0 0 0-8 8v57.45a8 8 0 0 0 6.57 7.88l80 14.54a7.6 7.6 0 0 0 1.43.13a8 8 0 0 0 8-8v-72a8 8 0 0 0-8-8m-8 70.41l-64-11.63V152h64ZM96 136H32a8 8 0 0 0-8 8v40a8 8 0 0 0 6.57 7.87l64 11.64a8.5 8.5 0 0 0 1.43.13a8 8 0 0 0 8-8V144a8 8 0 0 0-8-8m-8 50.05l-48-8.73V152h48ZM213.13 33.86a8 8 0 0 0-6.56-1.73l-80 14.55a8 8 0 0 0-6.57 7.87V112a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8V40a8 8 0 0 0-2.87-6.14M200 104h-64V61.22l64-11.63Zm-98.87-49.78a8 8 0 0 0-6.56-1.73l-64 11.64A8 8 0 0 0 24 72v40a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60.36a8 8 0 0 0-2.87-6.14M88 104H40V78.68L88 70Z" />
                  </g>
                </svg>
              </span>
              <span className={styles.tname}>{winName}</span>
              <span className={styles.tbtns} aria-hidden="true">
                <span className={styles.gb + " " + styles.gbMin} />
                <span className={styles.gb} />
              </span>
            </div>
            <div className={styles.wbody}>
              <p className={styles.line}>{NOTE_A}</p>
              <p className={styles.line + " " + styles.lineMute}>{NOTE_B}</p>
            </div>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.start} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M128 144h80v72l-80-14.55Zm-96 40l64 11.64V144H32Zm96-129.45V112h80V40ZM32 112h64V60.36L32 72Z" opacity=".2" />
                <path d="M208 136h-80a8 8 0 0 0-8 8v57.45a8 8 0 0 0 6.57 7.88l80 14.54a7.6 7.6 0 0 0 1.43.13a8 8 0 0 0 8-8v-72a8 8 0 0 0-8-8m-8 70.41l-64-11.63V152h64ZM96 136H32a8 8 0 0 0-8 8v40a8 8 0 0 0 6.57 7.87l64 11.64a8.5 8.5 0 0 0 1.43.13a8 8 0 0 0 8-8V144a8 8 0 0 0-8-8m-8 50.05l-48-8.73V152h48ZM213.13 33.86a8 8 0 0 0-6.56-1.73l-80 14.55a8 8 0 0 0-6.57 7.87V112a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8V40a8 8 0 0 0-2.87-6.14M200 104h-64V61.22l64-11.63Zm-98.87-49.78a8 8 0 0 0-6.56-1.73l-64 11.64A8 8 0 0 0 24 72v40a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V60.36a8 8 0 0 0-2.87-6.14M88 104H40V78.68L88 70Z" />
              </g>
            </svg>
          </span>
          <button type="button" className={styles.task} aria-pressed={aOn} onClick={() => setAOn((v) => !v)}>
            {taskA}
          </button>
          <button type="button" className={styles.task} aria-pressed={bOn} onClick={() => setBOn((v) => !v)}>
            {taskB}
          </button>
          <div className={styles.tray}>
            <span className={styles.spk} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2" />
                  <path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Zm54-106.08a40 40 0 0 1 0 52.88a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 0 1 12-10.58M248 128a79.9 79.9 0 0 1-20.37 53.34a8 8 0 0 1-11.92-10.67a64 64 0 0 0 0-85.33a8 8 0 1 1 11.92-10.67A79.83 79.83 0 0 1 248 128" />
                </g>
              </svg>
            </span>
            <button
              type="button"
              className={styles.bell}
              aria-pressed={alertOn}
              aria-label={ARIA_ALERT}
              onClick={() => setAlertOn((v) => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" />
                  <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" />
                </g>
              </svg>
            </button>
            <span className={styles.clock}>
              <span className={styles.clockReal}>{time}</span>
              <span className={styles.clockPre} aria-hidden="true">
                <span className={styles.ck + " " + styles.ck1}>{CLOCK_PREVIEW_1}</span>
                <span className={styles.ck + " " + styles.ck2}>{CLOCK_PREVIEW_2}</span>
              </span>
            </span>
            <span className={styles.balloon}>{balloonText}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
