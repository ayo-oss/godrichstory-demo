import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ExpandCollapsedBlock.module.scss";

export type ExpandCollapsedBlockProps = {
  fileLabel?: string;
  moreLabel?: string;
  lessLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CodeIcon = () => (
  <svg className={styles.ic} viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
    <g fill="currentColor">
      <path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2" />
      <path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25" />
    </g>
  </svg>
);

const CaretIcon = () => (
  <svg className={[styles.ic, styles.caret].join(" ")} viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
    <g fill="currentColor">
      <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
      <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
    </g>
  </svg>
);

export default function ExpandCollapsedBlock({
  fileLabel = "config.js",
  moreLabel = "Show more",
  lessLabel = "Collapse",
  demo = true,
  duration = 600,
  easing = "ease-out",
  color = "#ff4d1f",
}: ExpandCollapsedBlockProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);

  function onToggle() {
    setLive(false);
    setOpen((v) => !v);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={[styles.ecb, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ")} style={vars}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <span className={styles.paneFile}>
            <CodeIcon />
            {fileLabel}
          </span>
        </div>
        <div className={styles.paneBody}>
          <pre className={styles.peek}>
            <code>
              <span className={styles.k}>export</span> <span className={styles.k}>const</span> config = {"{"}
              {"\n  "}theme: <span className={styles.s}>&quot;auto&quot;</span>,
              {"\n  "}duration: <span className={styles.n}>220</span>,
              {"\n  "}easing: <span className={styles.s}>&quot;ease-out&quot;</span>,
              <span className={styles.more} id="ecb-react-more">
                <span className={styles.moreInner}>
                  <span className={styles.line}>
                    {"  "}radius: <span className={styles.n}>12</span>,
                  </span>
                  <span className={styles.line}>
                    {"  "}shadow: <span className={styles.k}>true</span>,
                  </span>
                  <span className={styles.line}>
                    {"  "}locale: <span className={styles.s}>&quot;en-US&quot;</span>,
                  </span>
                  <span className={styles.line}>
                    {"  "}retry: <span className={styles.n}>3</span>,
                  </span>
                  <span className={styles.line}>{"};"}</span>
                </span>
              </span>
            </code>
          </pre>
          <span className={styles.fade} aria-hidden="true" />
        </div>
        <div className={styles.toggleRow}>
          <button
            className={styles.toggle}
            type="button"
            aria-expanded={open}
            aria-controls="ecb-react-more"
            onClick={onToggle}
          >
            <span className={styles.labelWrap}>
              <span className={[styles.label, styles.labelMore].join(" ")} aria-hidden={open}>
                {moreLabel}
              </span>
              <span className={[styles.label, styles.labelLess].join(" ")} aria-hidden={!open}>
                {lessLabel}
              </span>
            </span>
            <CaretIcon />
          </button>
        </div>
      </div>
      <span className={styles.ecbCursor} aria-hidden="true" />
    </div>
  );
}
