import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./PasskeyEnrollCard.module.scss";

export type EnrollState = "idle" | "busy" | "done";
export type PasskeyEnrollCardProps = {
  heading?: string;
  labels?: Record<EnrollState, string>;
  notes?: Record<EnrollState, string>;
  /** 기기가 답하기까지 기다리는 시간 (ms) */
  verifyMs?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Timer = ReturnType<typeof setTimeout>;

const LOCK = (
  <g fill="currentColor">
    <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
    <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
  </g>
);

const FINGERPRINT = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M72 128a134.6 134.6 0 0 1-14.16 60.47a8 8 0 1 1-14.32-7.12A118.8 118.8 0 0 0 56 128a71.73 71.73 0 0 1 27-56.2a8 8 0 1 1 10 12.49A55.76 55.76 0 0 0 72 128m56-8a8 8 0 0 0-8 8a184.1 184.1 0 0 1-23 89.1a8 8 0 0 0 14 7.76A200.2 200.2 0 0 0 136 128a8 8 0 0 0-8-8m0-32a40 40 0 0 0-40 40a8 8 0 0 0 16 0a24 24 0 0 1 48 0a214.1 214.1 0 0 1-20.51 92a8 8 0 1 0 14.51 6.83A230 230 0 0 0 168 128a40 40 0 0 0-40-40m0-64A104.11 104.11 0 0 0 24 128a87.8 87.8 0 0 1-5 29.33a8 8 0 0 0 15.09 5.33A103.9 103.9 0 0 0 40 128a88 88 0 0 1 176 0a282 282 0 0 1-5.29 54.45a8 8 0 0 0 6.3 9.4a8 8 0 0 0 1.55.15a8 8 0 0 0 7.84-6.45A298.4 298.4 0 0 0 232 128A104.12 104.12 0 0 0 128 24M94.4 152.17a8 8 0 0 0-9.4 6.25a151 151 0 0 1-17.21 45.44a8 8 0 0 0 13.86 8a166.7 166.7 0 0 0 19-50.25a8 8 0 0 0-6.25-9.44M128 56a73 73 0 0 0-9 .56a8 8 0 0 0 2 15.87A56.08 56.08 0 0 1 184 128a252 252 0 0 1-1.92 31a8 8 0 0 0 6.92 9a8 8 0 0 0 1 .06a8 8 0 0 0 7.92-7a267 267 0 0 0 2-33A72.08 72.08 0 0 0 128 56m57.93 128.25a8 8 0 0 0-9.75 5.75c-1.46 5.69-3.15 11.4-5 17a8 8 0 0 0 5 10.13a7.9 7.9 0 0 0 2.55.42a8 8 0 0 0 7.58-5.46c2-5.92 3.79-12 5.35-18.05a8 8 0 0 0-5.72-9.78Z" />
  </g>
);

const SHIELD = (
  <g fill="currentColor">
    <path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
    <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-21.81C61.82 179.51 48 149.3 48 112V56h160ZM82.34 141.66a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32l-56 56a8 8 0 0 1-11.32 0Z" />
  </g>
);

export default function PasskeyEnrollCard({
  heading = "Passkey",
  labels = { idle: "Enroll this device", busy: "Checking", done: "Enrolled" },
  notes = {
    idle: "Sign in with your fingerprint or screen lock",
    busy: "Checking this device",
    done: "You can sign in straight from this device",
  },
  verifyMs = 1400,
  duration = 300,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PasskeyEnrollCardProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<EnrollState>("idle");
  const timer = useRef<Timer>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function clear() {
    if (timer.current !== null) clearTimeout(timer.current);
  }
  useEffect(() => clear, []); // 떠날 때 예약된 타이머를 버린다

  // 누르면 busy(잠김 + aria-busy) → done. 등록된 뒤 한 번 더 누르면 처음으로
  function run() {
    setDemo(false); // 사람이 만졌으니 자동 루프를 끈다
    clear();
    if (state === "done") {
      setState("idle");
      return;
    }
    setState("busy");
    timer.current = setTimeout(() => setState("done"), verifyMs);
  }

  return (
    <section className={`${styles.pk} ${demo ? styles.isDemo : ""}`} data-state={state} style={vars}>
      <div className={styles.card}>
        <p className={styles.head}>
          <span className={styles.headIc} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="16" height="16">{LOCK}</svg>
          </span>
          <span className={styles.headTxt}>{heading}</span>
        </p>

        <div className={styles.badge}>
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.arc} aria-hidden="true" />
          <span className={styles.ic} data-ic="print" aria-hidden="true">
            <svg viewBox="0 0 256 256" width="40" height="40">{FINGERPRINT}</svg>
          </span>
          <span className={styles.ic} data-ic="shield" aria-hidden="true">
            <svg viewBox="0 0 256 256" width="40" height="40">{SHIELD}</svg>
          </span>
        </div>

        <p className={styles.state} role="status" aria-live="polite">
          <span className={styles.word} data-word="idle">{notes.idle}</span>
          <span className={styles.word} data-word="busy">{notes.busy}</span>
          <span className={styles.word} data-word="done">{notes.done}</span>
        </p>

        <button
          className={styles.btn}
          type="button"
          aria-busy={state === "busy"}
          disabled={state === "busy"}
          onClick={run}
        >
          <span className={styles.face} data-face="idle">{labels.idle}</span>
          <span className={styles.face} data-face="busy">{labels.busy}</span>
          <span className={styles.face} data-face="done">{labels.done}</span>
        </button>
      </div>
    </section>
  );
}
