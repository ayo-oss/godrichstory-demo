import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./NotificationBell.module.scss";

export type NotificationBellLabels = {
  brand: string;
  bellLabel: string;
  panelTitle: string;
  markAll: string;
  unreadText: string;
  items: Array<{ title: string; time: string }>;
};

export type NotificationBellProps = {
  labels?: Partial<NotificationBellLabels>;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 이벤트 제네릭을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string; preventDefault(): void };
type Focusable = { focus: (o: { preventScroll: boolean }) => void };
type PanelEl = { inert?: boolean };
type Box<T> = { current: T | null };

const defaults: NotificationBellLabels = {
  brand: "Club",
  bellLabel: "Notifications",
  panelTitle: "Notifications",
  markAll: "Mark all as read",
  unreadText: "{n} unread",
  items: [
    { title: "Your order started shipping", time: "just now" },
    { title: "2 coupons expiring soon", time: "2 hours ago" },
    { title: "New comment posted", time: "yesterday" },
  ],
};

function BellIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2"/><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z"/></g></svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
  );
}

export default function NotificationBell({
  labels,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: NotificationBellProps) {
  const L = { ...defaults, ...labels };
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const [read, setRead] = useState<boolean[]>(L.items.map(() => false));
  const bellRef = useRef<Focusable | null>(null);
  const panelRef = useRef<PanelEl | null>(null);
  const rowRefs = useRef<Array<Focusable | null>>([]);

  // 닫힌 동안 패널 안 버튼은 탭 순서에서 빠진다 (inert)
  useEffect(() => { if (panelRef.current) panelRef.current.inert = !open; }, [open]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const unread = read.filter((r) => !r).length;

  function firstUnread() {
    const rows = rowRefs.current;                       // Box 배열 ref null 가드
    if (!rows) return undefined;
    for (let j = 0; j < rows.length; j++) {
      if (!read[j] && rows[j]) return rows[j];
    }
    return rows[0];
  }

  function setBell(on: boolean) {
    setLive(false);
    setOpen(on);
    (on ? firstUnread() : bellRef.current)?.focus({ preventScroll: true });
  }

  function markRead(i: number) {
    setLive(false);
    setRead(read.map((r, j) => (j === i ? true : r)));
  }

  function markAll() {
    setLive(false);
    setRead(L.items.map(() => true));
  }

  function panelKeys(e: KeyEvt) {
    if (e.key === "Escape") setBell(false);
  }

  const cls = [styles.frame, live ? styles.isDemo : "", open ? styles.isOpen : "", unread === 0 ? styles.isClear : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={L.brand}>
      <div className={styles.page}>
        <header className={styles.bar}>
          <p className={styles.brand}>{L.brand}</p>
          <button
            className={styles.bell}
            type="button"
            aria-label={L.bellLabel}
            aria-controls="nbf-panel"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setBell(!open)}
            ref={(el: Focusable | null) => { bellRef.current = el; }}
          >
            <BellIcon />
            <span className={styles.badge} data-n={String(unread)} aria-hidden="true">
              <span className={styles.n3}>3</span>
              <span className={styles.n2}>2</span>
              <span className={styles.n1}>1</span>
            </span>
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.skeleton} aria-hidden="true" />
          <p className={styles.skeletonShort} aria-hidden="true" />
        </div>
      </div>
      <aside
        className={styles.panel}
        id="nbf-panel"
        aria-label={L.panelTitle}
        aria-hidden={!open}
        onKeyDown={panelKeys}
        ref={(el: PanelEl | null) => { panelRef.current = el; }}
      >
        <header className={styles.phead}>
          <p className={styles.ptitle}>{L.panelTitle}</p>
          <button className={styles.allbtn} type="button" onClick={markAll}>
            <CheckIcon />
            <span>{L.markAll}</span>
          </button>
        </header>
        <ul className={styles.rows}>
          {L.items.map((it, i) => (
            <li key={it.title}>
              <button
                type="button"
                className={[styles.row, read[i] ? styles.isRead : ""].filter(Boolean).join(" ")}
                onClick={() => markRead(i)}
                ref={(el: Focusable | null) => { if (rowRefs.current) rowRefs.current[i] = el; }}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.rt}>{it.title}</span>
                <span className={styles.rtime}>{it.time}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <p className={styles.sr} aria-live="polite">{L.unreadText.replace("{n}", String(unread))}</p>
    </section>
  );
}
