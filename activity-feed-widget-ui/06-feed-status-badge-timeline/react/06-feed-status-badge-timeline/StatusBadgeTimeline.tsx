import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StatusBadgeTimeline.module.scss";

export type StatusBadgeTimelineProps = {
  groupLabel?: string;
  docName?: string;
  stages?: { key: string; label: string; tm: string }[];
  nextLabel?: string;
  phaseSuffix?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function PulseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M160 216h-.4a8.1 8.1 0 0 1-7.1-5.2l-57.2-150l-32 70.5A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.8l37.9-83.3a8.2 8.2 0 0 1 7.6-4.7a8 8 0 0 1 7.2 5.2L161 188.1l31.8-63.7a8.2 8.2 0 0 1 7.2-4.4h32a8 8 0 0 1 0 16h-27.1l-37.7 75.6a8.2 8.2 0 0 1-7.2 4.4Z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" />
        <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" />
      </g>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
        <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
      </g>
    </svg>
  );
}

function SealIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M174 47.75a254.19 254.19 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.36 254.36 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-99.58 72-110.93c16.53 11.35 72 53.7 72 110.93a72.08 72.08 0 0 1-72 72" />
      </g>
    </svg>
  );
}

const ICONS = [PlaneIcon, SearchIcon, SealIcon];

const DEFAULT_STAGES = [
  { key: "s1", label: "Submit", tm: "09:12" },
  { key: "s2", label: "Review", tm: "10:05" },
  { key: "s3", label: "Approve", tm: "waiting" },
];

export default function StatusBadgeTimeline({
  groupLabel = "Approval progress",
  docName = "Autumn campaign proposal",
  stages = DEFAULT_STAGES,
  nextLabel = "Next stage",
  phaseSuffix = " stage",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: StatusBadgeTimelineProps) {
  const [live, setLive] = useState(demo);
  const [at, setAt] = useState(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function next() {
    setLive(false);
    setAt((a) => (a + 1) % stages.length);
  }

  const cls = [styles.st, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.ic} aria-hidden="true"><PulseIcon /></span>
        <h2 className={styles.t}>{docName}</h2>
        <span className={styles.phase} data-at={at}>
          {stages.map((s, i) => (
            <i key={s.key} className={styles[`p${i + 1}`]} aria-hidden="true">{s.label + phaseSuffix}</i>
          ))}
        </span>
      </header>
      <span className={styles.sr} aria-live="polite">{stages[at].label + phaseSuffix}</span>
      <ol className={styles.tl}>
        {stages.map((s, i) => {
          const Icon = ICONS[i % ICONS.length];
          const rowCls = [
            styles.row,
            styles[`row${i + 1}`],
            i === at ? styles.isNow : "",
            i < at ? styles.isDone : "",
          ].filter(Boolean).join(" ");
          return (
            <li key={s.key} className={rowCls} aria-current={i === at ? "step" : undefined}>
              <span className={[styles.rail, i === stages.length - 1 ? styles.railEnd : ""].filter(Boolean).join(" ")} aria-hidden="true">
                <i className={styles.fill}></i>
              </span>
              <span className={styles.dot} aria-hidden="true"><Icon /></span>
              <span className={styles.lb}>{s.label}<time className={styles.tm}>{s.tm}</time></span>
            </li>
          );
        })}
      </ol>
      <button className={styles.next} type="button" onClick={next}>{nextLabel}</button>
    </section>
  );
}
