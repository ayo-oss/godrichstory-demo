import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HoldToDeleteButton.module.scss";

export type HoldToDeleteButtonProps = {
  label?: string;
  doneLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// DOM 전역 타입을 끌어오지 않으려고 필요한 모양만 여기서 선언한다
type PtrEvt = { pointerId: number; currentTarget: { setPointerCapture(id: number): void } };

export default function HoldToDeleteButton({
  label = "Hold to delete",
  doneLabel = "Deleted",
  duration = 1200,
  easing = "ease-out",
  color = "#ff4d1f",
}: HoldToDeleteButtonProps) {
  const [demo, setDemo] = useState(true);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  // 누르는 동안만 고리가 그려진다 — 한 바퀴를 다 그렸을 때만 삭제가 일어난다
  function down(e: PtrEvt) {
    setDemo(false);
    setDone(false);
    e.currentTarget.setPointerCapture(e.pointerId); // 손가락이 버튼 밖으로 나가도 취소를 여기서 받는다
    setHolding(true);
    stop();
    timer.current = setTimeout(() => {
      setDone(true);
      setHolding(false);
    }, duration);
  }

  function release() {
    stop();
    setHolding(false);
  }

  return (
    <div
      className={`${styles.hd} ${demo ? styles.isDemo : ""} ${holding ? styles.isHolding : ""}`}
      style={vars}
      data-state={done ? "done" : "idle"}
    >
      <div className={styles.dial}>
        <svg className={styles.ring} viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
          <circle className={styles.track} cx="44" cy="44" r="40" />
          <circle className={styles.arc} cx="44" cy="44" r="40" />
        </svg>
        <button
          className={styles.btn}
          type="button"
          aria-label={label}
          onPointerDown={down}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
        >
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="26" height="26">
              <g fill="currentColor">
                <path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" />
                <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />
              </g>
            </svg>
          </span>
        </button>
      </div>
      <p className={styles.log} role="status" aria-live="polite">
        <span className={styles.word} data-word="idle">{label}</span>
        <span className={styles.word} data-word="done">{doneLabel}</span>
      </p>
    </div>
  );
}
