// UploadProgressDropzoneHighlight — vanilla 판(run/329/demo/01-upload-progress-dropzone-highlight/index.html) 의 React 포트.
// 자식 요소를 넘나드는 dragenter·dragleave 쌍은 한 번의 진입에 여러 번 발생한다. 카운터 depth 를 두어
// depth 가 0보다 클 때만 하이라이트하면 자식 경계를 넘어도 테두리가 깜빡이지 않는다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressDropzoneHighlight.module.scss";

export type UploadProgressDropzoneHighlightProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type NVars = CSSProperties & { "--n"?: number };
type Box<T> = { current: T };
type DragEvt = { preventDefault: () => void; dataTransfer?: { files?: { length: number } } | null };

const LABEL = "파일을 여기로 끌어와 놓으세요";
const BADGE_PREFIX = "겹침";
const META = "dragenter · dragleave · dataTransfer";

export default function UploadProgressDropzoneHighlight({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: UploadProgressDropzoneHighlightProps) {
  const [demo, setDemo] = useState(true);
  const [depth, setDepth] = useState(0);
  const [dropped, setDropped] = useState(false);
  const dropTimer = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  const badgeVars: NVars = { "--n": depth };

  function live(): void {
    setDemo(false);
  }
  function enter(e: DragEvt): void {
    e.preventDefault();
    setDepth((d) => d + 1);
  }
  function leave(e: DragEvt): void {
    e.preventDefault();
    setDepth((d) => Math.max(0, d - 1));
  }
  function over(e: DragEvt): void {
    e.preventDefault();
  }
  function drop(e: DragEvt): void {
    e.preventDefault();
    setDepth(0);
    setDropped(true);
    window.clearTimeout(dropTimer.current);
    dropTimer.current = window.setTimeout(() => setDropped(false), 640);
  }

  const rootCls = demo ? `${styles.dz} ${styles.isDemo}` : styles.dz;
  const zoneCls = [styles.zone, depth > 0 ? styles.isOver : "", dropped ? styles.isDropped : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <div
          className={zoneCls}
          role="button"
          tabIndex={0}
          aria-label={LABEL}
          onDragEnter={enter}
          onDragLeave={leave}
          onDragOver={over}
          onDrop={drop}
          onPointerDown={live}
          onFocus={live}
        >
          <span className={styles.ring} aria-hidden="true"></span>
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="26" height="26"><g fill="currentColor"><path d="M240 128a80 80 0 0 1-80 80H72A56 56 0 1 1 85.92 97.74v.1A80 80 0 0 1 240 128" opacity=".2"/><path d="M178.34 165.66L160 147.31V208a8 8 0 0 1-16 0v-60.69l-18.34 18.35a8 8 0 0 1-11.32-11.32l32-32a8 8 0 0 1 11.32 0l32 32a8 8 0 0 1-11.32 11.32M160 40a88.08 88.08 0 0 0-78.71 48.68A64 64 0 1 0 72 216h40a8 8 0 0 0 0-16H72a48 48 0 0 1 0-96c1.1 0 2.2 0 3.29.12A88 88 0 0 0 72 128a8 8 0 0 0 16 0a72 72 0 1 1 100.8 66a8 8 0 0 0 3.2 15.34a7.9 7.9 0 0 0 3.2-.68A88 88 0 0 0 160 40"/></g></svg>
          </span>
          <span className={styles.label}>{LABEL}</span>
          <span className={styles.badge} style={badgeVars} aria-hidden="true">{BADGE_PREFIX} <b className={styles.n}></b></span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META}</span>
        </div>
      </div>
    </main>
  );
}
