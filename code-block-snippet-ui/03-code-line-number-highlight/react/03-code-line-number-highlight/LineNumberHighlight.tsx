import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LineNumberHighlight.module.scss";

export type LineNumberHighlightProps = {
  langLabel?: string;
  tooltipText?: string;
  /** Auto-play loop (for gallery). Turns off on real interaction */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LINES = [".card {", "  display: grid;", "  gap: 12px;", "  padding: 16px;", "}"];
const CALLED_INDEX = 2;

export default function LineNumberHighlight({
  langLabel = "CSS",
  tooltipText = "Gap between cards",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: LineNumberHighlightProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const [tipId] = useState(() => "lnh-tip-" + Math.random().toString(36).slice(2));

  function show() {
    setLive(false);
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={[styles.lnh, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ")} style={vars}>
      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <span className={styles.paneLang}>{langLabel}</span>
        </div>
        <div className={styles.paneBody}>
          <pre>
            <code className={styles.lines}>
              {LINES.map((text, i) =>
                i === CALLED_INDEX ? (
                  <span
                    key={i}
                    className={[styles.ln, styles.isCalled].join(" ")}
                    tabIndex={0}
                    aria-describedby={tipId}
                    onMouseEnter={show}
                    onMouseLeave={hide}
                    onFocus={show}
                    onBlur={hide}
                  >
                    {text}
                  </span>
                ) : (
                  <span key={i} className={styles.ln}>
                    {text}
                  </span>
                )
              )}
            </code>
          </pre>
        </div>
      </div>
      <div className={styles.tooltip} id={tipId} role="tooltip">
        {tooltipText}
      </div>
      <span className={styles.lnhCursor} aria-hidden="true" />
    </div>
  );
}
