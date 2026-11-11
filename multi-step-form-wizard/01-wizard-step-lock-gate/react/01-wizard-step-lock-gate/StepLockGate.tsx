import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StepLockGate.module.scss";

export type StepLockGateProps = {
  heading?: string;
  rules?: string[];
  lockedHint?: string;
  readyHint?: string;
  nextLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_RULES = ["Accept the terms of service", "Accept the privacy notice", "I am 14 or older"];

function Tick() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M216 96v112a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160z" />
      </g>
    </svg>
  );
}

export default function StepLockGate({
  heading = "Step 2 · Required checks",
  rules = DEFAULT_RULES,
  lockedHint = "Required items are still open",
  readyHint = "You can move to the next step",
  nextLabel = "Next",
  groupLabel = "Required checks for signup",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: StepLockGateProps) {
  const [on, setOn] = useState<boolean[]>(rules.map(() => false));
  const [live, setLive] = useState(demo);
  const [nudge, setNudge] = useState(false);

  const ready = on.length > 0 && on.every(Boolean);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(i: number) {
    setLive(false);
    setOn((prev) => prev.map((v, n) => (n === i ? !v : v)));
  }

  function next() {
    setLive(false);
    // 잠긴 동안 눌러도 단계는 안 넘어간다 — 이유만 강조한다
    setNudge(!ready);
  }

  const cls = [styles.lg, live ? styles.isDemo : "", ready ? styles.isReady : "", nudge ? styles.isNudge : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.h}>{heading}</p>
      <ul className={styles.list}>
        {rules.map((r, i) => (
          <li key={r} className={[styles.row, on[i] ? styles.isOn : ""].filter(Boolean).join(" ")} data-row={i + 1}>
            <button className={styles.box} type="button" role="checkbox" aria-checked={on[i]} onClick={() => toggle(i)}>
              <span className={styles.tick} aria-hidden="true"><Tick /></span>
              <span className={styles.label}>{r}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.foot}>
        <p className={styles.why}>
          <span className={styles.whyA}>{lockedHint}</span>
          <span className={styles.whyB}>{readyHint}</span>
        </p>
        <button className={styles.next} type="button" aria-disabled={!ready} onClick={next}>
          {!ready && <span className={styles.lock} aria-hidden="true"><Lock /></span>}
          <span className={styles.nextT}>{nextLabel}</span>
        </button>
      </div>
    </section>
  );
}
