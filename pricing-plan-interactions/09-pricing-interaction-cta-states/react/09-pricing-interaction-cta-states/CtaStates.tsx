import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CtaStates.module.scss";

export type CtaState = "idle" | "busy" | "done";
export type CtaStatesProps = {
  labels?: Record<CtaState, string>;
  busyMs?: number;
  doneMs?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const FACES: CtaState[] = ["idle", "busy", "done"];

const CHECK = (
  <g fill="currentColor">
    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
    <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
  </g>
);

export default function CtaStates({
  labels = { idle: "Start subscription", busy: "Working", done: "Your subscription started" },
  busyMs = 1200,
  doneMs = 1200,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
}: CtaStatesProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<CtaState>("idle");
  const timers = useRef<number[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => () => { (timers.current || []).forEach((t) => window.clearTimeout(t)); }, []);

  // 퇴장이 아니라 교체다 — 버튼은 어느 순간에도 사라지지 않고 얼굴만 갈아 낀다
  function start() {
    (timers.current || []).forEach((t) => window.clearTimeout(t));
    setDemo(false);
    setState("busy");
    timers.current = [
      window.setTimeout(() => setState("done"), busyMs),
      window.setTimeout(() => setState("idle"), busyMs + doneMs),
    ];
  }

  return (
    <div className={`${styles.cs} ${demo ? styles.isDemo : ""}`} style={vars} data-state={state}>
      <button
        className={styles.btn}
        type="button"
        aria-busy={state === "busy"}
        disabled={!demo && state !== "idle"}
        onClick={start}
      >
        {FACES.map((f) => (
          <span key={f} className={styles.face} data-face={f} aria-hidden={demo ? f !== "idle" : f !== state}>
            {f === "busy" ? <span className={styles.ring} aria-hidden="true" /> : null}
            {f === "done" ? (
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="22" height="22">{CHECK}</svg>
              </span>
            ) : null}
            <span className={styles.label}>{labels[f]}</span>
          </span>
        ))}
      </button>
      {/* 보이지 않는 문장은 aria-hidden 이라, 상태가 바뀌면 한 문장만 읽힌다 */}
      <p className={styles.live} aria-live="polite">
        {FACES.map((f) => (
          <span key={f} className={styles.msg} data-face={f} aria-hidden={demo ? f !== "idle" : f !== state}>
            {labels[f]}
          </span>
        ))}
      </p>
    </div>
  );
}
