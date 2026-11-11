import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./TeamActivityStream.module.scss";

export type TeamActivityStreamProps = {
  heading?: string;
  groupLabel?: string;
  addLabel?: string;
  nowLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Row = { key: number; name: string; initial: string; av: string; text: string };

const INITIAL: Row[] = [
  { key: 1, name: "Park Seo-a", initial: "P", av: "#4cd4a6", text: " approved the weekly report" },
  { key: 2, name: "Lee Jun", initial: "L", av: "#ff9ebb", text: " left a comment on the stock list" },
  { key: 3, name: "Choi Do-yun", initial: "C", av: "#6ec8ff", text: " uploaded the purchase order" },
];

function ActivityIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M160 216h-.4a8.1 8.1 0 0 1-7.1-5.2l-57.2-150l-32 70.5A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.8l37.9-83.3a8.2 8.2 0 0 1 7.6-4.7a8 8 0 0 1 7.2 5.2L161 188.1l31.8-63.7a8.2 8.2 0 0 1 7.2-4.4h32a8 8 0 0 1 0 16h-27.1l-37.7 75.6a8.2 8.2 0 0 1-7.2 4.4Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M228 128a100 100 0 1 1-100-100a100 100 0 0 1 100 100" opacity=".2" />
        <path d="M208 120h-72V48a8 8 0 0 0-16 0v72H48a8 8 0 0 0 0 16h72v72a8 8 0 0 0 16 0v-72h72a8 8 0 0 0 0-16" />
      </g>
    </svg>
  );
}

export default function TeamActivityStream({
  heading = "Team activity",
  groupLabel = "Team activity stream",
  addLabel = "Add activity",
  nowLabel = "now",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TeamActivityStreamProps) {
  const [live, setLive] = useState(demo);
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [grown, setGrown] = useState<number[]>([]);
  const [count, setCount] = useState(4);

  // 방금 넣은 줄은 두 단계(shut → grow)로 렌더해야 grid 전환이 애니메이션으로 잡힌다
  useEffect(() => {
    const top = rows[0];
    if (top && !grown.includes(top.key)) {
      const raf = requestAnimationFrame(() => setGrown((g) => [...g, top.key]));
      return () => cancelAnimationFrame(raf);
    }
  }, [rows, grown]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function add() {
    setLive(false);
    const key = Date.now();
    setRows((r) => [{ key, name: "Han Byeol", initial: "H", av: "#b9a0ff", text: " edited the autumn campaign doc" }, ...r]);
    setCount((c) => c + 1);
  }

  const top = rows[0];
  const cls = [styles.ts, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.ic} aria-hidden="true"><ActivityIcon /></span>
        <h2 className={styles.t}>{heading}</h2>
        <span className={styles.n} aria-live="polite">
          {live ? (
            <>
              <i className={`${styles.nA} ${styles.nLayer}`}>{count - 1}</i>
              <i className={`${styles.nB} ${styles.nLayer}`}>{count}</i>
            </>
          ) : (
            count
          )}
        </span>
      </header>
      <ul className={styles.list} role="log" aria-live="polite">
        <li className={styles.rowNew}>
          <div className={styles.fold}>
            <div className={styles.cell}>
              <span className={styles.av} style={{ background: color }}>K</span>
              <p className={styles.line}><b>Kim Haneul</b> edited the autumn campaign doc</p>
              <time className={styles.tm}>{nowLabel}</time>
              <span className={styles.bar} aria-hidden="true"></span>
            </div>
          </div>
        </li>
        {rows.map((r) => {
          const isNew = r === top && !grown.includes(r.key);
          const rowCls = [styles.row, isNew ? styles.shut : "", r === top ? styles.in : ""].filter(Boolean).join(" ");
          return (
            <li key={r.key} className={rowCls}>
              <div className={styles.fold}>
                <div className={styles.cell}>
                  <span className={styles.av} style={{ background: r.av }}>{r.initial}</span>
                  <p className={styles.line}><b>{r.name}</b>{r.text}</p>
                  <time className={styles.tm}>{r === top ? nowLabel : "26m ago"}</time>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button className={styles.add} type="button" onClick={add}>
        <span className={styles.plus} aria-hidden="true"><PlusIcon /></span>
        {addLabel}
      </button>
    </section>
  );
}
