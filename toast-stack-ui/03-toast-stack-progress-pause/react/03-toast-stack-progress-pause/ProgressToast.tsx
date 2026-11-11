import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProgressToast.module.scss";

export type ProgressToastProps = {
  message?: string;
  sub?: string;
  holdLabel?: string;
  closeLabel?: string;
  openLabel?: string;
  regionLabel?: string;
  life?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--life"?: string };

export default function ProgressToast({
  message = "Report exported",
  sub = "This closes on its own in a moment",
  holdLabel = "Paused",
  closeLabel = "Close notification",
  openLabel = "Show the notice",
  regionLabel = "Self-closing notification",
  life = 4200,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ProgressToastProps) {
  const [demo, setDemo] = useState(true);
  const [on, setOn] = useState(false);
  const [hold, setHold] = useState(false);
  const [run, setRun] = useState(0);
  const timer = useRef<number[]>([0]);
  const rest = useRef<number[]>([life, 0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--life": `${life}ms` };

  useEffect(() => () => { clearTimeout((timer.current ?? [0])[0]); }, []);

  function later(ms: number) {
    const t = timer.current ?? [0];
    clearTimeout(t[0]);
    t[0] = setTimeout(() => { setOn(false); setHold(false); }, Math.max(ms, 0)) as unknown as number;
  }
  function show() {
    setDemo(false);
    setOn(true);
    setHold(false);
    setRun((v) => v + 1); // key 를 바꿔 바가 처음부터 다시 줄게 한다
    const r = rest.current ?? [life, 0];
    r[0] = life; r[1] = Date.now();
    later(life);
  }
  function pause() {
    if (!on || hold) return;
    const r = rest.current ?? [life, 0];
    clearTimeout((timer.current ?? [0])[0]);
    r[0] = r[0] - (Date.now() - r[1]);
    setHold(true);
  }
  function resume() {
    if (!on || !hold) return;
    const r = rest.current ?? [life, 0];
    r[1] = Date.now();
    setHold(false);
    later(r[0]);
  }

  return (
    <div className={`${styles.pb} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.box}>
        <div
          className={`${styles.toast} ${on ? styles.isOn : ""} ${hold ? styles.isHold : ""}`}
          role="region"
          aria-label={regionLabel}
          tabIndex={0}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
        >
          <div className={styles.row}>
            <span className={styles.ic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="22" height="22"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g></svg>
            </span>
            <span className={styles.txt}>
              <span className={styles.msg}>{message}</span>
              <span className={styles.sub}>{sub}</span>
            </span>
            <span className={styles.hold} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="12" height="12"><g fill="currentColor"><path d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" opacity=".2" /><path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40Z" /></g></svg>
              <span className={styles.holdtxt}>{holdLabel}</span>
            </span>
            <button className={styles.x} type="button" aria-label={closeLabel} onClick={() => { setOn(false); setHold(false); clearTimeout((timer.current ?? [0])[0]); }}>
              <svg viewBox="0 0 256 256" width="14" height="14"><g fill="currentColor"><path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" /><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" /></g></svg>
            </button>
          </div>
          <span className={styles.track} aria-hidden="true"><span key={run} className={styles.fill} /></span>
        </div>
      </div>
      <button className={styles.go} type="button" onClick={show}>{openLabel}</button>
    </div>
  );
}
