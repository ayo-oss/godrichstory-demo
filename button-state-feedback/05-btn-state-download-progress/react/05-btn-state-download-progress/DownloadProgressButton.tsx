import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DownloadProgressButton.module.scss";

export type DownloadProgressButtonProps = {
  label?: string;
  doneLabel?: string;
  note?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--p"?: string;
};
type State = "idle" | "busy" | "done";

const STEP = 4;   // 한 번에 올리는 퍼센트
const TICK = 80;  // 올리는 간격(ms)

export default function DownloadProgressButton({
  label = "Download",
  doneLabel = "Saved",
  note = "The inside of the button is the progress bar",
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: DownloadProgressButtonProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<State>("idle");
  const [p, setP] = useState(0);

  // 퍼센트를 --p 하나에만 적는다 — 채움 너비도 숫자도 그 변수에서 나온다
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const btnVars: Vars = demo ? {} : { "--p": String(p) };

  useEffect(() => {
    if (state !== "busy") return;
    let v = 0;
    setP(0);
    const id = setInterval(() => {
      v = Math.min(100, v + STEP);
      setP(v);
      if (v === 100) {
        clearInterval(id);
        setState("done");
      }
    }, TICK);
    return () => clearInterval(id);
  }, [state]);

  function start() {
    setDemo(false);
    if (state === "busy") return;
    setState("busy");
  }

  return (
    <div className={`${styles.dl} ${demo ? styles.isDemo : ""}`} style={vars}>
      <button
        className={styles.btn}
        type="button"
        style={btnVars}
        data-state={state}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={demo ? 0 : p}
        onClick={start}
      >
        <span className={styles.fill} aria-hidden="true" />
        <span className={styles.face} data-face="idle">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">
              <g fill="currentColor">
                <path d="M216 48v160H40V48a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
                <path d="M224 144v64a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-64a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0m-101.66 5.66a8 8 0 0 0 11.32 0l40-40a8 8 0 0 0-11.32-11.32L136 124.69V32a8 8 0 0 0-16 0v92.69L93.66 98.34a8 8 0 0 0-11.32 11.32Z" />
              </g>
            </svg>
          </span>
          <span className={styles.t}>{label}</span>
        </span>
        <span className={styles.face} data-face="busy">
          <span className={styles.pct} />
        </span>
        <span className={styles.face} data-face="done">
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="20" height="20">
              <g fill="currentColor">
                <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
              </g>
            </svg>
          </span>
          <span className={styles.t}>{doneLabel}</span>
        </span>
      </button>
      <p className={styles.note}>{note}</p>
    </div>
  );
}
