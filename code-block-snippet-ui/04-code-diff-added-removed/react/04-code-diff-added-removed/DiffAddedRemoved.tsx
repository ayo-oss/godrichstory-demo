import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DiffAddedRemoved.module.scss";

export type DiffAddedRemovedProps = {
  fileName?: string;
  openLabel?: string;
  closeLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function DiffIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path
          d="M80 64a24 24 0 1 1-24-24a24 24 0 0 1 24 24m120 104a24 24 0 1 0 24 24a24 24 0 0 0-24-24"
          opacity=".2"
        />
        <path d="M112 152a8 8 0 0 0-8 8v28.69L66.34 151a8 8 0 0 1-2.34-5.63V95a32 32 0 1 0-16 0v50.38a23.85 23.85 0 0 0 7 17L92.69 200H64a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8M40 64a16 16 0 1 1 16 16a16 16 0 0 1-16-16m168 97v-50.37a23.85 23.85 0 0 0-7-17L163.31 56H192a8 8 0 0 0 0-16h-48a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0V67.31L189.66 105a8 8 0 0 1 2.34 5.66V161a32 32 0 1 0 16 0m-8 47a16 16 0 1 1 16-16a16 16 0 0 1-16 16" />
      </g>
    </svg>
  );
}

export default function DiffAddedRemoved({
  fileName = "config.css",
  openLabel = "Show hidden lines",
  closeLabel = "Hide expanded lines",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: DiffAddedRemovedProps) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ");

  function toggle() {
    setLive(false);
    setOpen(!open);
  }

  return (
    <div className={cls} style={vars}>
      <div className={styles.pane}>
        <div className={styles.head}>
          <span className={styles.ic} aria-hidden="true">
            <DiffIcon />
          </span>
          <span className={styles.file}>{fileName}</span>
        </div>
        <span className={styles.cursor} aria-hidden="true" />
        <div className={styles.body}>
          <div className={[styles.line, styles.lineTop].join(" ")}>
            <span className={styles.sign} aria-hidden="true">
              {" "}
            </span>
            <span className={styles.src}>
              <span className={styles.k}>.card</span> <span className={styles.p}>{"{"}</span>
            </span>
          </div>

          <button
            className={styles.fold}
            type="button"
            aria-expanded={open}
            aria-controls="cd-hidden-lines"
            aria-label={open ? closeLabel : openLabel}
            onClick={toggle}
          >
            <span className={styles.sign} aria-hidden="true">
              {" "}
            </span>
            <span className={[styles.src, styles.dots].join(" ")}>···</span>
          </button>
          <div className={styles.foldBody} id="cd-hidden-lines">
            <div className={styles.foldIn}>
              <div className={styles.line}>
                <span className={styles.sign} aria-hidden="true">
                  {" "}
                </span>
                <span className={styles.src}>
                  &nbsp;&nbsp;<span className={styles.k}>display</span>
                  <span className={styles.p}>:</span> <span className={styles.s}>flex</span>
                  <span className={styles.p}>;</span>
                </span>
              </div>
              <div className={styles.line}>
                <span className={styles.sign} aria-hidden="true">
                  {" "}
                </span>
                <span className={styles.src}>
                  &nbsp;&nbsp;<span className={styles.k}>align-items</span>
                  <span className={styles.p}>:</span> <span className={styles.s}>center</span>
                  <span className={styles.p}>;</span>
                </span>
              </div>
            </div>
          </div>

          <div className={[styles.line, styles.lineDel, styles.lineDel1].join(" ")}>
            <span className={styles.sign}>-</span>
            <span className={styles.src}>
              &nbsp;&nbsp;<span className={styles.k}>padding</span>
              <span className={styles.p}>:</span> <span className={styles.n}>12px 16px</span>
              <span className={styles.p}>;</span>
            </span>
          </div>
          <div className={[styles.line, styles.lineDel, styles.lineDel2].join(" ")}>
            <span className={styles.sign}>-</span>
            <span className={styles.src}>
              &nbsp;&nbsp;<span className={styles.k}>border-radius</span>
              <span className={styles.p}>:</span> <span className={styles.n}>4px</span>
              <span className={styles.p}>;</span>
            </span>
          </div>
          <div className={[styles.line, styles.lineAdd, styles.lineAdd1].join(" ")}>
            <span className={styles.sign}>+</span>
            <span className={styles.src}>
              &nbsp;&nbsp;<span className={styles.k}>padding</span>
              <span className={styles.p}>:</span> <span className={styles.n}>16px 20px</span>
              <span className={styles.p}>;</span>
            </span>
          </div>
          <div className={[styles.line, styles.lineAdd, styles.lineAdd2].join(" ")}>
            <span className={styles.sign}>+</span>
            <span className={styles.src}>
              &nbsp;&nbsp;<span className={styles.k}>border-radius</span>
              <span className={styles.p}>:</span> <span className={styles.n}>12px</span>
              <span className={styles.p}>;</span>
            </span>
          </div>

          <div className={[styles.line, styles.lineTop].join(" ")}>
            <span className={styles.sign} aria-hidden="true">
              {" "}
            </span>
            <span className={styles.src}>
              <span className={styles.p}>{"}"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
