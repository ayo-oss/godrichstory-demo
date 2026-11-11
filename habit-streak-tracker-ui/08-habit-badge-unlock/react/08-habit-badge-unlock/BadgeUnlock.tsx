// BadgeUnlock — vanilla 판(run/297/demo/08-habit-badge-unlock/index.html) 의 React 포트.
// 앞면(잠김)·뒷면(해제)을 preserve-3d 로 겹치고 각 면은 backface-visibility: hidden 이다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BadgeUnlock.module.scss";

export type BadgeUnlockProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BadgeVars = CSSProperties & { "--i"?: string };

const STORE = "godrich-habit-badge";
const MARKS = [7, 30, 100];
const TITLE = "성취 배지";
const BADGE_LABEL = "{n}일 배지";
const LOCK_TEXT = "잠김";
const SAY_TEXT = "지금 {d}일 · 배지 {n}개 열림";
const PLUS1_TEXT = "하루 더";
const PLUS10_TEXT = "열흘 더";
const RESET_TEXT = "처음으로";

export default function BadgeUnlock({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: BadgeUnlockProps) {
  const [days, setDays] = useState(12);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setDays(Number(raw) || 0); }
    } catch (e) { /* 기본값 그대로 */ }
  }, []);

  function bump(n: number) {
    setDemo(false);
    const next = Math.max(0, n < 0 ? 0 : days + n);
    setDays(next);
    try { window.localStorage.setItem(STORE, String(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }

  const open = MARKS.filter((m) => days >= m).length;
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const badgeVars = (i: number): BadgeVars => ({ "--i": String(i) });

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-medal" viewBox="0 0 256 256" fill="currentColor"><g><path d="M176 96a48 48 0 1 1-48-48a48 48 0 0 1 48 48" opacity=".2"/><path d="M216 96a88 88 0 1 0-144 67.83V240a8 8 0 0 0 11.58 7.16L128 225l44.43 22.21a8.1 8.1 0 0 0 3.57.79a8 8 0 0 0 8-8v-76.17A87.85 87.85 0 0 0 216 96M56 96a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72m112 131.06l-36.43-18.21a8 8 0 0 0-7.16 0L88 227.06v-52.69a87.89 87.89 0 0 0 80 0ZM128 152a56 56 0 1 0-56-56a56.06 56.06 0 0 0 56 56m0-96a40 40 0 1 1-40 40a40 40 0 0 1 40-40"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <div className={styles.head}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.say} role="status" aria-live="polite">
            {SAY_TEXT.replace("{d}", String(days)).replace("{n}", String(open))}
          </p>
        </div>
        <div className={styles.row}>
          {MARKS.map((m, i) => {
            const on = days >= m;
            return (
              <button
                className={[styles.badge, on ? styles.open : ""].filter(Boolean).join(" ")}
                key={m}
                type="button"
                aria-pressed={on ? "true" : "false"}
                aria-label={BADGE_LABEL.replace("{n}", String(m))}
                style={badgeVars(i)}
              >
                <span className={styles.inner}>
                  <span className={`${styles.face} ${styles.faceLock}`}>
                    <b className={styles.mark}>{m}</b>
                    <span className={styles.lock}>{LOCK_TEXT}</span>
                  </span>
                  <span className={`${styles.face} ${styles.faceWin}`}>
                    <svg className={styles.ico} aria-hidden="true"><use href="#ico-medal" /></svg>
                    <b className={styles.mark}>{m}</b>
                    <span className={styles.shine} aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.bar}>
          <button className={styles.go} type="button" onClick={() => bump(1)}>{PLUS1_TEXT}</button>
          <button className={styles.go} type="button" onClick={() => bump(10)}>{PLUS10_TEXT}</button>
          <button className={styles.reset} type="button" onClick={() => bump(-1)}>{RESET_TEXT}</button>
        </div>
      </div>
    </main>
  );
}
