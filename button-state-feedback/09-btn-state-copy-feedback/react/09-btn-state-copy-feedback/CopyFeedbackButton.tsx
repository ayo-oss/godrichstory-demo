import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CopyFeedbackButton.module.scss";

export type CopyFeedbackButtonProps = {
  code?: string;
  idleLabel?: string;
  doneLabel?: string;
  liveMessage?: string;
  buttonLabel?: string;
  holdMs?: number;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

const COPY_ICON = (
  <g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2" /><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" /></g>
);
const DONE_ICON = (
  <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>
);

export default function CopyFeedbackButton({
  code = "npm i godrich-ui",
  idleLabel = "Copy",
  doneLabel = "Copied",
  liveMessage = "Command copied",
  buttonLabel = "Copy the command to the clipboard",
  holdMs = 1600,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
}: CopyFeedbackButtonProps) {
  const [demo, setDemo] = useState(true); // 처음엔 자동 루프, 사람이 건드리면 끈다
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  // 클립보드로 실제로 넘긴 뒤에만 라벨을 바꾼다. 실패해도 같은 길로 되돌아온다
  const copy = useCallback(() => {
    setDemo(false);
    const finish = () => {
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), holdMs);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(finish, finish);
    } else {
      finish();
    }
  }, [code, holdMs]);

  return (
    <div
      className={`${styles.cp} ${demo ? styles.isDemo : ""}`}
      style={vars}
      data-copied={copied ? "1" : "0"}
    >
      <div className={styles.row}>
        <code className={styles.code}>{code}</code>
        <button className={styles.btn} type="button" aria-label={buttonLabel} onClick={copy}>
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.face} data-face="idle">
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="18" height="18">{COPY_ICON}</svg>
            </span>
            <span className={styles.t}>{idleLabel}</span>
          </span>
          <span className={styles.face} data-face="done">
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="18" height="18">{DONE_ICON}</svg>
            </span>
            <span className={styles.t}>{doneLabel}</span>
          </span>
        </button>
      </div>
      {/* 같은 말이 읽히는 영역으로도 한 번 나간다 */}
      <p className={styles.live} role="status" aria-live="polite">
        <span className={styles.word}>{liveMessage}</span>
      </p>
    </div>
  );
}
