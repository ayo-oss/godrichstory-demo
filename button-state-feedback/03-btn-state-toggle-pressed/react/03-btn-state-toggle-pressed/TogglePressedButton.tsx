import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TogglePressedButton.module.scss";

export type TogglePressedButtonProps = {
  labels?: { off: string; on: string; note: string };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BELL_OFF = (
  <g fill="currentColor">
    <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" />
    <path d="M53.92 34.62a8 8 0 1 0-11.84 10.76L58.82 63.8A79.6 79.6 0 0 0 48 104c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.8a40 40 0 0 0 78.4 0h15.44l19.44 21.38a8 8 0 1 0 11.84-10.76ZM128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a63.65 63.65 0 0 1 6.26-27.62L168.09 184Zm166-4.73a8.1 8.1 0 0 1-2.93.55a8 8 0 0 1-7.44-5.08C196.35 156.19 192 129.75 192 104a64 64 0 0 0-95.57-55.69a8 8 0 0 1-7.9-13.91A80 80 0 0 1 208 104c0 35.35 8.05 58.59 10.52 64.88a8 8 0 0 1-4.52 10.37Z" />
  </g>
);

const BELL_ON = (
  <g fill="currentColor">
    <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" />
    <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" />
  </g>
);

export default function TogglePressedButton({
  labels = { off: "Get alerts", on: "Alerts on", note: "One button holds both states" },
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: TogglePressedButtonProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState(false);
  const [pop, setPop] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 클래스가 아니라 aria-pressed 를 뒤집는다. 보이는 색과 읽히는 상태가 한 값에서 나온다
  function toggle() {
    setDemo(false); // 사람이 눌렀으니 자동 루프를 끈다
    setOn((v) => !v);
    // 같은 방향으로 다시 눌러도 반동이 한 번 더 돌게 한 프레임 뒤에 다시 건다
    setPop(false);
    requestAnimationFrame(() => setPop(true));
  }

  return (
    <div className={`${styles.tp} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button
        className={`${styles.btn} ${pop ? styles.isPop : ""}`}
        type="button"
        aria-pressed={on}
        onClick={toggle}
        onAnimationEnd={() => setPop(false)}
      >
        <span className={styles.face} data-face="off">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">{BELL_OFF}</svg>
          </span>
          <span className={styles.lab}>{labels.off}</span>
        </span>
        <span className={styles.face} data-face="on">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">{BELL_ON}</svg>
          </span>
          <span className={styles.lab}>{labels.on}</span>
        </span>
      </button>
      <p className={styles.note}>{labels.note}</p>
    </div>
  );
}
