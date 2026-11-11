import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AppPasswordReveal.module.scss";

export type RevealState = "hidden" | "shown" | "burned";
export type AppPasswordRevealProps = {
  token?: string;
  warn?: string;
  labels?: { issue: string; copy: string };
  logs?: Record<RevealState, string>;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const WARNING = (
  <g fill="currentColor">
    <path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2" />
    <path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
  </g>
);

const KEY = (
  <g fill="currentColor">
    <path d="M232 98.36c-1.27 38.56-33.33 69.64-71.91 69.64a71.7 71.7 0 0 1-26.92-5.17L120 176H96v24H72v24H40a8 8 0 0 1-8-8v-28.69a8 8 0 0 1 2.34-5.65l58.83-58.83A71.7 71.7 0 0 1 88 95.91c0-38.58 31.08-70.64 69.64-71.87A72 72 0 0 1 232 98.36" opacity=".2" />
    <path d="M216.57 39.43a80 80 0 0 0-132.66 81.35L28.69 176A15.86 15.86 0 0 0 24 187.31V216a16 16 0 0 0 16 16h32a8 8 0 0 0 8-8v-16h16a8 8 0 0 0 8-8v-16h16a8 8 0 0 0 5.66-2.34l9.56-9.57A79.7 79.7 0 0 0 160 176h.1a80 80 0 0 0 56.47-136.57M224 98.1c-1.09 34.09-29.75 61.86-63.89 61.9H160a63.7 63.7 0 0 1-23.65-4.51a8 8 0 0 0-8.84 1.68L116.69 168H96a8 8 0 0 0-8 8v16H72a8 8 0 0 0-8 8v16H40v-28.69l58.83-58.82a8 8 0 0 0 1.68-8.84A63.7 63.7 0 0 1 96 95.92c0-34.14 27.81-62.8 61.9-63.89A64 64 0 0 1 224 98.1M192 76a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
  </g>
);

const COPY = (
  <g fill="currentColor">
    <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
    <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
  </g>
);

export default function AppPasswordReveal({
  token = "q7hm-42vd-xk9r-3ptz",
  warn = "Shown only once",
  labels = { issue: "Issue", copy: "Copy" },
  logs = {
    hidden: "Not issued yet",
    shown: "Visible now only — copying closes it",
    burned: "Copied. You cannot see it again",
  },
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: AppPasswordRevealProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<RevealState>("hidden");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 사람이 만지면 자동 루프를 끈다
  function applyState(s: RevealState) {
    setDemo(false);
    setState(s);
  }

  function copyToken() {
    if (state !== "shown") return; // 잠긴 버튼은 아무 일도 하지 않는다
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    applyState("burned"); // 한 번 복사하면 다시는 안 열린다
  }

  return (
    <section className={`${styles.tk} ${demo ? styles.isDemo : ""}`} data-state={state} style={vars}>
      <p className={styles.warn}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">{WARNING}</svg>
        </span>
        {warn}
      </p>
      <div className={styles.field}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">{KEY}</svg>
        </span>
        <span className={styles.slot}>
          <span className={styles.val}>{token}</span>
          <span className={styles.cover} aria-hidden="true" />
        </span>
      </div>
      <div className={styles.row}>
        <button
          className={`${styles.btn} ${styles.btnIssue}`}
          type="button"
          disabled={state !== "hidden"}
          onClick={() => applyState("shown")}
        >
          {labels.issue}
        </button>
        <button
          className={`${styles.btn} ${styles.btnCopy}`}
          type="button"
          aria-disabled={state !== "shown"}
          onClick={copyToken}
        >
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">{COPY}</svg>
          </span>
          {labels.copy}
        </button>
      </div>
      <p className={styles.live} role="status" aria-live="polite">
        <span className={styles.word} data-word="hidden">{logs.hidden}</span>
        <span className={styles.word} data-word="shown">{logs.shown}</span>
        <span className={styles.word} data-word="burned">{logs.burned}</span>
      </p>
    </section>
  );
}
