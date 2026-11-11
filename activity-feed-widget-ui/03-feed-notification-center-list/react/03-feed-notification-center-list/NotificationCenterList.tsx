import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./NotificationCenterList.module.scss";

export type NotificationCenterListProps = {
  groupLabel?: string;
  markAllLabel?: string;
  unreadMsg?: (n: number) => string;
  items?: { key: string; msg: string; tm: string; read?: boolean }[];
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function BellIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" />
        <path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

const DEFAULT_ITEMS = [
  { key: "n1", msg: "The weekly report was approved", tm: "5m ago" },
  { key: "n2", msg: "Lee Jun left a comment", tm: "20m ago" },
  { key: "n3", msg: "A purchase order file arrived", tm: "1h ago" },
  { key: "n4", msg: "The stock list was refreshed", tm: "yesterday", read: true },
];

export default function NotificationCenterList({
  groupLabel = "Notification list",
  markAllLabel = "Mark all read",
  unreadMsg = (n) => `${n} unread`,
  items = DEFAULT_ITEMS,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: NotificationCenterListProps) {
  const [live, setLive] = useState(demo);
  const [read, setRead] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((x) => [x.key, !!x.read]))
  );

  const left = items.filter((x) => !read[x.key]).length;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function open(k: string) {
    setLive(false);
    setRead((r) => ({ ...r, [k]: true }));
  }

  function all() {
    setLive(false);
    setRead(Object.fromEntries(items.map((x) => [x.key, true])));
  }

  const cls = [styles.nc, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.bellw}>
          <span className={styles.bell} aria-hidden="true"><BellIcon /></span>
          <span className={styles.badge} aria-live="polite">{unreadMsg(left)}</span>
        </span>
        <button className={styles.all} type="button" onClick={all}>
          <span className={styles.ck} aria-hidden="true"><CheckIcon /></span>
          {markAllLabel}
        </button>
      </header>
      <ul className={styles.list}>
        {items.map((x, i) => (
          <li key={x.key} className={[styles.row, i + 1 <= 3 ? styles[`r${i + 1}`] : "", read[x.key] ? styles.isRead : ""].filter(Boolean).join(" ")}>
            <button className={styles.it} type="button" onClick={() => open(x.key)}>
              <span className={styles.dot} aria-hidden="true"></span>
              <span className={styles.msg}>{x.msg}</span>
              <span className={styles.meta}>
                <span className={styles.readIc} aria-hidden="true"><CheckIcon /></span>
                {x.tm}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
