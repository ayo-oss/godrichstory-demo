import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TerminalTypingCursor.module.scss";

export type TerminalTypingCursorProps = {
  cmd?: string;
  replayLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T | null };

const CMD = "npm i -D eslint prettier";

function TerminalIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" />
      </g>
    </svg>
  );
}

export default function TerminalTypingCursor({
  cmd = CMD,
  replayLabel = "Replay",
  demo = true,
  duration = 2000,
  easing = "ease-out",
  color = "#6ec8ff",
}: TerminalTypingCursorProps) {
  const [live, setLive] = useState(demo);
  const [typed, setTyped] = useState(cmd);
  const [out1, setOut1] = useState(true);
  const [out2, setOut2] = useState(true);
  const timers = useRef<number[]>([]) as Box<number[]>;

  useEffect(() => {
    return () => {
      (timers.current || []).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function clear() {
    (timers.current || []).forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  function play() {
    setLive(false);
    clear();
    setTyped("");
    setOut1(false);
    setOut2(false);
    let i = 0;
    function tick() {
      i += 1;
      setTyped(cmd.slice(0, i));
      if (i < cmd.length) {
        const id = window.setTimeout(tick, 36);
        (timers.current || (timers.current = [])).push(id);
      } else {
        const a = window.setTimeout(() => setOut1(true), 240);
        const b = window.setTimeout(() => setOut2(true), 520);
        timers.current = [...(timers.current || []), a, b];
      }
    }
    tick();
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div
      className={[styles.term, live ? styles.isDemo : ""].join(" ")}
      style={vars}
      role="button"
      tabIndex={0}
      aria-label={replayLabel}
      onClick={play}
      onKeyDown={(e: KeyEvt) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          play();
        }
      }}
    >
      <div className={styles.head}>
        <TerminalIcon />
        <span className={styles.name}>bash</span>
      </div>
      <div className={styles.body}>
        <div className={styles.line}>
          <span className={styles.prompt} aria-hidden="true">$</span>
          <span className={styles.cmd} style={live ? undefined : { width: `${typed.length}ch` }}>{live ? cmd : typed}</span>
          <span className={styles.cursor} aria-hidden="true" />
        </div>
        <div
          className={[styles.out, styles.out1].join(" ")}
          style={live ? undefined : { opacity: out1 ? 1 : 0, transform: out1 ? "translateY(0)" : "translateY(8px)" }}
        >
          <span className={styles.c}>added </span>
          <span className={styles.n}>2 packages</span>
          <span className={styles.c}> in 1.4s</span>
        </div>
        <div
          className={[styles.out, styles.out2].join(" ")}
          style={live ? undefined : { opacity: out2 ? 1 : 0, transform: out2 ? "translateY(0)" : "translateY(8px)" }}
        >
          <span className={styles.c}>audited </span>
          <span className={styles.n}>128 packages</span>
          <span className={styles.c}> in 2.1s</span>
        </div>
      </div>
    </div>
  );
}
