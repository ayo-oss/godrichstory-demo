import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CommentThreadMini.module.scss";

export type CommentThreadMiniProps = {
  groupLabel?: string;
  topName?: string;
  topText?: string;
  topTm?: string;
  repliesLabel?: string;
  addLabel?: string;
  nowLabel?: string;
  replies?: { key: number; name: string; initial: string; av: string; text: string }[];
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function CaretIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
        <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
      </g>
    </svg>
  );
}

const DEFAULT_REPLIES = [
  { key: 1, name: "Lee Jun", initial: "L", av: "#ff9ebb", text: " It's at the bottom of the release notes" },
  { key: 2, name: "Choi Do-yun", initial: "C", av: "#6ec8ff", text: " It's on the dashboard notice too" },
];

export default function CommentThreadMini({
  groupLabel = "Comment thread",
  topName = "Park Seo-a",
  topText = " Where can I see the new release schedule?",
  topTm = "1h ago",
  repliesLabel = "2 replies",
  addLabel = "Reply",
  nowLabel = "now",
  replies = DEFAULT_REPLIES,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CommentThreadMiniProps) {
  const [live, setLive] = useState(demo);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(replies);
  const [grown, setGrown] = useState<number[]>([]);

  // 방금 넣은 답글은 두 단계(shut → grow)로 렌더해야 grid 전환이 애니메이션으로 잡힌다
  const last = rows[rows.length - 1];
  useEffect(() => {
    if (last && !grown.includes(last.key)) {
      const raf = requestAnimationFrame(() => setGrown((g) => [...g, last.key]));
      return () => cancelAnimationFrame(raf);
    }
  }, [rows, grown, last]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    setLive(false);
    setOpen((o) => !o);
  }

  function add() {
    setLive(false);
    setOpen(true);
    setRows((r) => [...r, { key: Date.now(), name: "Han Byeol", initial: "H", av: "#b9a0ff", text: " I'll post the deck soon too" }]);
  }

  const cls = [styles.ct, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <article className={styles.top}>
        <span className={styles.av} style={{ background: "#4cd4a6" }}>P</span>
        <div className={styles.body}>
          <p className={styles.txt}><b>{topName}</b>{topText}</p>
          <time className={styles.tm}>{topTm}</time>
        </div>
      </article>
      <button
        className={[styles.tg, open ? styles.tgOpen : ""].filter(Boolean).join(" ")}
        type="button"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className={styles.caret} aria-hidden="true"><CaretIcon /></span>
        {repliesLabel}
      </button>
      <div className={[styles.fold, open ? styles.foldOpen : ""].filter(Boolean).join(" ")}>
        <div className={styles.inner}>
          <ul className={styles.list} role="log" aria-live="polite">
            {rows.map((r, i) => {
              const isNew = r === last && !grown.includes(r.key);
              const rowCls = [
                styles.rep,
                i === 0 ? styles.rep1 : "",
                i === 1 && rows.length > 2 ? styles.repOld : "",
                !isNew ? styles.grow : "",
                isNew ? styles.shut : "",
              ].filter(Boolean).join(" ");
              return (
                <li key={r.key} className={rowCls}>
                  <div className={styles.rfold}>
                    <div className={styles.rcell}>
                      <span className={styles.avS} style={{ background: r.av }}>{r.initial}</span>
                      <p className={styles.txt}><b>{r.name}</b>{r.text}</p>
                      <time className={styles.tm}>{r === last ? nowLabel : "50m ago"}</time>
                    </div>
                  </div>
                </li>
              );
            })}
            <li className={styles.repNew}>
              <div className={styles.rfold}>
                <div className={styles.rcell}>
                  <span className={styles.avS} style={{ background: "#2f6df6" }}>K</span>
                  <p className={styles.txt}><b>Kim Haneul</b> I'll share the schedule link too</p>
                  <time className={styles.tm}>{nowLabel}</time>
                </div>
              </div>
            </li>
          </ul>
          <button className={styles.add} type="button" onClick={add}>{addLabel}</button>
        </div>
      </div>
    </section>
  );
}
