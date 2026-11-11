import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./AsyncCycleButton.module.scss";

export type AsyncState = "idle" | "busy" | "done";
export type AsyncCycleButtonProps = {
  labels?: Record<AsyncState, string>;
  logs?: Record<AsyncState, string>;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Timer = ReturnType<typeof setTimeout>;

const BUSY_MS = 1200; // 서버가 답한 시점
const DONE_MS = 2000; // 완료 표시를 2초 보여 주고 원복

const SPINNER = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M136 32v32a8 8 0 0 1-16 0V32a8 8 0 0 1 16 0m88 88h-32a8 8 0 0 0 0 16h32a8 8 0 0 0 0-16m-45.09 47.6a8 8 0 0 0-11.31 11.31l22.62 22.63a8 8 0 0 0 11.32-11.32ZM128 184a8 8 0 0 0-8 8v32a8 8 0 0 0 16 0v-32a8 8 0 0 0-8-8m-50.91-16.4l-22.63 22.62a8 8 0 0 0 11.32 11.32l22.62-22.63a8 8 0 0 0-11.31-11.31M72 128a8 8 0 0 0-8-8H32a8 8 0 0 0 0 16h32a8 8 0 0 0 8-8m-6.22-73.54a8 8 0 0 0-11.32 11.32L77.09 88.4A8 8 0 0 0 88.4 77.09Z" />
  </g>
);

const CHECK = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
  </g>
);

export default function AsyncCycleButton({
  labels = { idle: "Save", busy: "Saving", done: "Saved" },
  logs = { idle: "Ready to press", busy: "Sending now", done: "All done" },
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: AsyncCycleButtonProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<AsyncState>("idle");
  const t1 = useRef<Timer>(null);
  const t2 = useRef<Timer>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function clear() {
    if (t1.current !== null) clearTimeout(t1.current);
    if (t2.current !== null) clearTimeout(t2.current);
  }
  useEffect(() => clear, []); // 떠날 때 예약된 타이머를 버린다

  // 한 번 누르면 busy → done → idle 로 스스로 돌아온다. 도는 동안 버튼은 잠긴다
  function run() {
    setDemo(false); // 사람이 눌렀으니 자동 루프를 끈다
    clear();
    setState("busy");
    t1.current = setTimeout(() => setState("done"), BUSY_MS);
    t2.current = setTimeout(() => setState("idle"), BUSY_MS + DONE_MS);
  }

  return (
    <div className={`${styles.ac} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button
        className={styles.btn}
        type="button"
        data-state={state}
        aria-busy={state === "busy"}
        disabled={state !== "idle"}
        onClick={run}
      >
        <span className={styles.face} data-face="idle">
          <span className={styles.txt}>{labels.idle}</span>
        </span>
        <span className={styles.face} data-face="busy">
          <span className={`${styles.ic} ${styles.icSpin}`} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">{SPINNER}</svg>
          </span>
          <span className={styles.txt}>{labels.busy}</span>
        </span>
        <span className={styles.face} data-face="done">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">{CHECK}</svg>
          </span>
          <span className={styles.txt}>{labels.done}</span>
        </span>
      </button>
      <p className={styles.log} role="status" aria-live="polite">
        <span className={styles.word} data-word="idle">{logs.idle}</span>
        <span className={styles.word} data-word="busy">{logs.busy}</span>
        <span className={styles.word} data-word="done">{logs.done}</span>
      </p>
    </div>
  );
}
