import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NotificationsPanel.module.scss";

export type NotificationsPanelProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Item = { id: string; title: string; desc: string; unread: boolean };

const INITIAL: Item[] = [
  { id: "a", title: "새 댓글", desc: "박하은님이 댓글을 남겼습니다", unread: true },
  { id: "b", title: "결제 완료", desc: "이번 달 구독이 갱신됐습니다", unread: true },
  { id: "c", title: "팀 초대", desc: "정유나님이 팀에 합류했습니다", unread: false },
];

export default function NotificationsPanel({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: NotificationsPanelProps) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState(INITIAL);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const unread = items.filter((i) => i.unread).length;

  function markRead(id: string) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, unread: false } : i)));
  }

  return (
    <div className={styles.np} style={vars}>
      <button type="button" className={styles.bell} aria-label="알림" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={styles.bellIc} />
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>
      <div className={`${styles.panel} ${open ? styles.open : ""}`} role="menu" aria-label="알림 목록">
        <p className={styles.panelTitle}>알림</p>
        {items.map((it) => (
          <button key={it.id} type="button" role="menuitem" className={styles.item} onClick={() => markRead(it.id)}>
            <span className={`${styles.dot} ${it.unread ? styles.unread : ""}`} />
            <span className={styles.itemBody}><strong>{it.title}</strong><span>{it.desc}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
