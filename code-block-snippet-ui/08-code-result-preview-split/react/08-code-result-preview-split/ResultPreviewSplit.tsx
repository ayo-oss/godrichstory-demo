import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ResultPreviewSplit.module.scss";

export type ResultPreviewSplitProps = {
  fileName?: string;
  codeLabel?: string;
  resultLabel?: string;
  badgeLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function CodeIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2" />
        <path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25" />
      </g>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 56c-80 0-112 72-112 72s32 72 112 72s112-72 112-72s-32-72-112-72m0 112a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" />
        <path d="M247.31 124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57 61.26 162.88 48 128 48S61.43 61.26 36.34 86.35C17.51 105.18 9 124 8.69 124.76a8 8 0 0 0 0 6.5c.35.79 8.82 19.57 27.65 38.4C61.43 194.74 93.12 208 128 208s66.57-13.26 91.66-38.34c18.83-18.83 27.3-37.61 27.65-38.4a8 8 0 0 0 0-6.5M128 192c-30.78 0-57.67-11.19-79.93-33.25A133.5 133.5 0 0 1 25 128a133.3 133.3 0 0 1 23.07-30.75C70.33 75.19 97.22 64 128 64s57.67 11.19 79.93 33.25A133.5 133.5 0 0 1 231.05 128c-7.21 13.46-38.62 64-103.05 64m0-112a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32" />
      </g>
    </svg>
  );
}

export default function ResultPreviewSplit({
  fileName = "badge.css",
  codeLabel = "View code",
  resultLabel = "View result",
  badgeLabel = "New",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ResultPreviewSplitProps) {
  const [live, setLive] = useState(demo);
  const [showResult, setShowResult] = useState(false);

  function setView(next: boolean) {
    setLive(false);
    setShowResult(next);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const codeStyle: CSSProperties | undefined = live
    ? undefined
    : { opacity: showResult ? 0 : 1, visibility: showResult ? "hidden" : "visible" };
  const resultStyle: CSSProperties | undefined = live
    ? undefined
    : { opacity: showResult ? 1 : 0, visibility: showResult ? "visible" : "hidden" };

  return (
    <div className={[styles.rps, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.head}>
        <span className={styles.file}>{fileName}</span>
        <div className={styles.tabs}>
          <button
            className={[styles.tab, styles.tabCode, !showResult ? styles.isOn : ""].join(" ")}
            type="button"
            aria-pressed={!showResult}
            aria-label={codeLabel}
            onClick={() => setView(false)}
          >
            <CodeIcon />
          </button>
          <button
            className={[styles.tab, styles.tabEye, showResult ? styles.isOn : ""].join(" ")}
            type="button"
            aria-pressed={showResult}
            aria-label={resultLabel}
            onClick={() => setView(true)}
          >
            <EyeIcon />
          </button>
        </div>
      </div>
      <div className={styles.stage}>
        <span className={styles.ptr} aria-hidden="true" />
        <pre className={[styles.face, styles.faceCode].join(" ")} style={codeStyle} aria-hidden={showResult}>
          <code>
            <span className={styles.ln}><span className={styles.k}>.badge</span> <span className={styles.c}>{"{"}</span></span>
            <span className={styles.ln}>  <span className={styles.k}>border-radius</span><span className={styles.c}>:</span> <span className={styles.n}>999px</span><span className={styles.c}>;</span></span>
            <span className={styles.ln}>  <span className={styles.k}>background</span><span className={styles.c}>:</span> <span className={styles.s}>linear-gradient</span><span className={styles.c}>(#26f, #6cf);</span></span>
            <span className={styles.ln}><span className={styles.c}>{"}"}</span></span>
          </code>
        </pre>
        <div className={[styles.face, styles.faceResult].join(" ")} style={resultStyle} aria-hidden={!showResult}>
          <div className={styles.card}>
            <span className={styles.badge}>{badgeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
