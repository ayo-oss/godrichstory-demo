import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CopyButtonState.module.scss";

export type CopyButtonStateProps = {
  langLabel?: string;
  idleLabel?: string;
  doneLabel?: string;
  chipLabel?: string;
  ariaLabel?: string;
  code?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const Copy = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
    <g fill="currentColor">
      <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
      <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
    </g>
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
    <g fill="currentColor">
      <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
      <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
    </g>
  </svg>
);

const DEFAULT_CODE = `.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
}`;

export default function CopyButtonState({
  langLabel = "CSS",
  idleLabel = "Copy",
  doneLabel = "Copied",
  chipLabel = "Saved to clipboard",
  ariaLabel = "Copy code",
  code = DEFAULT_CODE,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: CopyButtonStateProps) {
  const [live, setLive] = useState(demo);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function onClick() {
    setLive(false);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={[styles.ccb, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <span className={styles.paneLang}>{langLabel}</span>
          <div className={styles.paneActions}>
            <span className={styles.paneChip} aria-hidden="true">{chipLabel}</span>
            <button
              className={[styles.paneCopy, !live && copied ? styles.isCopied : ""].join(" ")}
              type="button"
              aria-label={ariaLabel}
              onClick={onClick}
            >
              <span className={[styles.copyState, styles.copyStateIdle].join(" ")}>
                <Copy />
                <span>{idleLabel}</span>
              </span>
              <span className={[styles.copyState, styles.copyStateDone].join(" ")}>
                <Check />
                <span>{doneLabel}</span>
              </span>
            </button>
          </div>
        </div>
        <div className={styles.paneBody}>
          <span className={styles.paneSel} aria-hidden="true" />
          <pre>
            <code>
              <span className={styles.k}>.btn</span> {"{"}
              {"\n  "}
              <span className={styles.k}>display</span>: <span className={styles.s}>inline-flex</span>;
              {"\n  "}
              <span className={styles.k}>align-items</span>: <span className={styles.s}>center</span>;
              {"\n  "}
              <span className={styles.k}>gap</span>: <span className={styles.n}>8px</span>;
              {"\n  "}
              <span className={styles.k}>padding</span>: <span className={styles.n}>8px</span> <span className={styles.n}>16px</span>;
              {"\n  "}
              <span className={styles.k}>border-radius</span>: <span className={styles.n}>12px</span>;
              {"\n}"}
            </code>
          </pre>
        </div>
      </div>
      <span className={styles.ccbCursor} aria-hidden="true" />
      <span className={styles.sr} role="status" aria-live="polite">{!live && copied ? doneLabel : ""}</span>
    </div>
  );
}
