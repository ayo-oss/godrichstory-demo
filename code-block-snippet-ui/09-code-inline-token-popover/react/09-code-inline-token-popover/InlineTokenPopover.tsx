import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InlineTokenPopover.module.scss";

export type InlineTokenPopoverProps = {
  fileName?: string;
  describeLabel?: string;
  pop1Text?: string;
  pop2Text?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };

function InfoIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" />
      </g>
    </svg>
  );
}

export default function InlineTokenPopover({
  fileName = "tips.md",
  describeLabel = "Show description",
  pop1Text = "The radius that rounds off the corners.",
  pop2Text = "The shadow that gives a floating feel.",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: InlineTokenPopoverProps) {
  const [live, setLive] = useState(demo);
  const [openTok, setOpenTok] = useState<0 | 1 | 2>(0);

  function open(i: 1 | 2) {
    setLive(false);
    setOpenTok(i);
  }
  function reset() {
    setOpenTok(0);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const tok1Style: CSSProperties | undefined = live
    ? undefined
    : openTok === 1
      ? { background: "rgba(47,109,246,.14)", color: "var(--color)" }
      : undefined;
  const tok2Style: CSSProperties | undefined = live
    ? undefined
    : openTok === 2
      ? { background: "rgba(47,109,246,.14)", color: "var(--color)" }
      : undefined;
  const pop1Style: CSSProperties | undefined = live
    ? undefined
    : { opacity: openTok === 1 ? 1 : 0, visibility: openTok === 1 ? "visible" : "hidden", transform: openTok === 1 ? "translateY(0) scale(1)" : "translateY(6px) scale(.96)" };
  const pop2Style: CSSProperties | undefined = live
    ? undefined
    : { opacity: openTok === 2 ? 1 : 0, visibility: openTok === 2 ? "visible" : "hidden", transform: openTok === 2 ? "translateY(0) scale(1)" : "translateY(6px) scale(.96)" };

  return (
    <div
      className={[styles.tp, live ? styles.isDemo : ""].join(" ")}
      style={vars}
      onKeyDown={(e: KeyEvt) => {
        if (e.key === "Escape") { e.preventDefault(); reset(); }
      }}
    >
      <div className={styles.head}>
        <InfoIcon />
        <span className={styles.label}>{fileName}</span>
      </div>
      <div className={styles.body}>
        <p className={styles.line}>
          Round the corners with{" "}
          <button
            className={[styles.tok, styles.tok1, openTok === 1 ? styles.isOn : ""].join(" ")}
            type="button"
            aria-describedby="tp-pop1"
            aria-label={describeLabel}
            style={tok1Style}
            onPointerEnter={() => open(1)}
            onFocus={() => open(1)}
            onClick={() => open(1)}
          >
            border-radius
          </button>
          .
        </p>
        <p className={styles.line}>
          Lift the card using{" "}
          <button
            className={[styles.tok, styles.tok2, openTok === 2 ? styles.isOn : ""].join(" ")}
            type="button"
            aria-describedby="tp-pop2"
            aria-label={describeLabel}
            style={tok2Style}
            onPointerEnter={() => open(2)}
            onFocus={() => open(2)}
            onClick={() => open(2)}
          >
            box-shadow
          </button>
          .
        </p>
        <pre className={styles.code}><code><span className={styles.ln}><span className={styles.k}>border-radius</span><span className={styles.c}>:</span> <span className={styles.n}>16px</span><span className={styles.c}>;</span></span><span className={styles.ln}><span className={styles.k}>box-shadow</span><span className={styles.c}>:</span> <span className={styles.s}>0 8px 16px</span> <span className={styles.n}>rgba(0,0,0,.18)</span><span className={styles.c}>;</span></span></code></pre>
        <span className={styles.ptr} aria-hidden="true" />
        <div id="tp-pop1" className={[styles.pop, styles.pop1, openTok === 1 ? styles.isOpen : ""].join(" ")} style={pop1Style} role="tooltip">
          {pop1Text}
        </div>
        <div id="tp-pop2" className={[styles.pop, styles.pop2, openTok === 2 ? styles.isOpen : ""].join(" ")} style={pop2Style} role="tooltip">
          {pop2Text}
        </div>
      </div>
    </div>
  );
}
