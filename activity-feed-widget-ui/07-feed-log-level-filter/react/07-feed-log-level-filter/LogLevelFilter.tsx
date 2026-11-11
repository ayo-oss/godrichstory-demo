import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogLevelFilter.module.scss";

export type LogLevelFilterProps = {
  groupLabel?: string;
  chipsLabel?: string;
  heading?: string;
  liveHint?: string;
  showAllMsg?: string;
  onlyMsg?: (n: number) => string;
  chips?: { key: string; label: string }[];
  rows?: { key: string; level: string; msg: string; tm: string }[];
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function InfoIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M144 176a8 8 0 0 1-8 8a16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16a16 16 0 0 1 16 16v40a8 8 0 0 1 8 8m88-48A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88m-92-32a12 12 0 1 0-12-12a12 12 0 0 0 12 12" />
      </g>
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2" />
        <path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
      </g>
    </svg>
  );
}

function ErrIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
      </g>
    </svg>
  );
}

const LEVEL_ICONS: Record<string, typeof InfoIcon> = { info: InfoIcon, warn: WarnIcon, error: ErrIcon };

const DEFAULT_CHIPS = [
  { key: "info", label: "Info 3" },
  { key: "warn", label: "Warn 2" },
  { key: "error", label: "Error 1" },
];

const DEFAULT_ROWS = [
  { key: "l1", level: "info", msg: "Deploy 1.4.2 done", tm: "09:12" },
  { key: "l2", level: "warn", msg: "Cache latency 840ms", tm: "09:15" },
  { key: "l3", level: "info", msg: "Scheduled job registered", tm: "09:18" },
  { key: "l4", level: "error", msg: "Payment webhook failed (retry 1/3)", tm: "09:21" },
  { key: "l5", level: "warn", msg: "Disk free 12%", tm: "09:24" },
  { key: "l6", level: "info", msg: "Health check passed", tm: "09:27" },
];

export default function LogLevelFilter({
  groupLabel = "System log",
  chipsLabel = "Level filter",
  heading = "System log",
  liveHint = "Pick levels with the chips",
  showAllMsg = "Showing every line",
  onlyMsg = (n) => `${n} levels only`,
  chips = DEFAULT_CHIPS,
  rows = DEFAULT_ROWS,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LogLevelFilterProps) {
  const [live, setLive] = useState(demo);
  const [on, setOn] = useState<Record<string, boolean>>({ info: true, warn: true, error: true });

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(k: string) {
    setLive(false);
    setOn((o) => ({ ...o, [k]: !o[k] }));
  }

  const onList = chips.filter((c) => on[c.key]).map((c) => c.key);
  const showAll = onList.length === 0 || onList.length === chips.length;

  const cls = [styles.lg, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.cursor} aria-hidden="true"></span>
        <h2 className={styles.t}>{heading}</h2>
        <span className={styles.live} aria-live="polite">{showAll ? showAllMsg : onlyMsg(onList.length)}</span>
      </header>
      <div className={styles.chips} role="group" aria-label={chipsLabel}>
        {chips.map((c) => {
          const Icon = LEVEL_ICONS[c.key] || InfoIcon;
          return (
            <button
              key={c.key}
              className={[styles.chip, styles[`c_${c.key}`], on[c.key] ? "" : styles.isOff].filter(Boolean).join(" ")}
              type="button"
              aria-pressed={on[c.key]}
              onClick={() => toggle(c.key)}
            >
              <span className={[styles.ci, c.key === "warn" ? styles.ciW : c.key === "error" ? styles.ciE : ""].filter(Boolean).join(" ")} aria-hidden="true"><Icon /></span>
              {c.label}
            </button>
          );
        })}
      </div>
      <ul className={styles.list}>
        {rows.map((r) => {
          const Icon = LEVEL_ICONS[r.level] || InfoIcon;
          return (
            <li key={r.key} className={[styles.row, styles[`lv_${r.level}`]].filter(Boolean).join(" ")} hidden={!(showAll || onList.indexOf(r.level) >= 0)}>
              <div className={styles.fold}>
                <p className={styles.line}>
                  <i className={[styles.lv, r.level === "warn" ? styles.lvW : r.level === "error" ? styles.lvE : styles.lvI].filter(Boolean).join(" ")} aria-hidden="true"><Icon /></i>
                  {r.msg}
                  <time className={styles.tm}>{r.tm}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
