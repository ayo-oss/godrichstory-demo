import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LeaveGuardInline.module.scss";

export type LeaveGuardInlineProps = {
  groupLabel?: string;
  currentHeading?: string;
  leftHeading?: string;
  fieldLabel?: string;
  initialValue?: string;
  idleNote?: string;
  guardMessage?: string;
  leaveLabel?: string;
  stayLabel?: string;
  backLabel?: string;
  nextLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type KeyEvt = { key: string; preventDefault(): void };
type ChEvt = { target: { value: string } };
// ambient 가 얇아 DOM 전역 타입을 못 쓴다 — 초점 받을 요소의 최소 꼴만 로컬로 선언
type Focusable = { focus: (o: { preventScroll: boolean }) => void };
type Box<T> = { current: T };

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

function BackIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M112 56v144l-72-72Z" opacity=".2" />
        <path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" />
      </g>
    </svg>
  );
}

export default function LeaveGuardInline({
  groupLabel = "Delivery detail step",
  currentHeading = "Step 2 · Delivery",
  leftHeading = "Step 1 · Order check",
  fieldLabel = "Ship to",
  initialValue = "12 Yanghwa-ro, Mapo-gu",
  idleNote = "What you typed is not saved yet",
  guardMessage = "Leaving drops what you just typed",
  leaveLabel = "Leave anyway",
  stayLabel = "Keep writing",
  backLabel = "Back",
  nextLabel = "Next",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: LeaveGuardInlineProps) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  const [live, setLive] = useState(demo);
  const goBtn = useState<Box<Focusable | null>>({ current: null })[0];
  const stayBtn = useState<Box<Focusable | null>>({ current: null })[0];
  const backBtn = useState<Box<Focusable | null>>({ current: null })[0];

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function openGuard(on: boolean) {
    setOpen(on);
    // iframe 안이라 부모 페이지가 끌려가지 않게 preventScroll
    (on ? goBtn.current : backBtn.current)?.focus({ preventScroll: true });
  }

  function back() {
    setLive(false);
    if (value.trim() === "") { setGone(true); return; }   // 빈 칸이면 물음 없이 그냥 돌아간다
    openGuard(true);
  }

  function leave() {
    setValue("");                                         // 나가기를 고르면 쓰던 값이 실제로 사라진다
    openGuard(false);
    setGone(true);
  }

  function sheetKeys(e: KeyEvt) {
    if (e.key === "Escape") { openGuard(false); return; }
    if (e.key !== "Tab") return;
    e.preventDefault();                                   // 둘뿐이라 Tab 과 Shift+Tab 이 같은 짝을 가리킨다
    const atGo = document.activeElement === goBtn.current;
    (atGo ? stayBtn.current : goBtn.current)?.focus({ preventScroll: true });
  }

  const cls = [styles.lgd, live ? styles.isDemo : "", open ? styles.isOpen : "", gone ? styles.isGone : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <p className={styles.h}>
        <span className={styles.hA}>{currentHeading}</span>
        <span className={styles.hB}>{leftHeading}</span>
      </p>

      <div className={styles.field}>
        <label className={styles.lab} htmlFor="lgd-addr">{fieldLabel}</label>
        <input
          className={styles.in}
          id="lgd-addr"
          type="text"
          value={value}
          autoComplete="off"
          onChange={(e: ChEvt) => { setLive(false); setGone(false); setValue(e.target.value); }}
        />
      </div>

      <div className={styles.guard}>
        <p className={styles.idle}>{idleNote}</p>
        <div
          className={styles.sheet}
          role="alertdialog"
          aria-label={guardMessage}
          aria-hidden={!open}
          onKeyDown={open ? sheetKeys : undefined}
        >
          <span className={styles.skin} aria-hidden="true" />
          <p className={styles.msg}>
            <span className={styles.ico} aria-hidden="true"><WarnIcon /></span>
            {guardMessage}
          </p>
          <div className={styles.acts}>
            <button
              className={styles.go}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={leave}
              ref={(el: Focusable | null) => { goBtn.current = el; }}
            >
              {leaveLabel}
            </button>
            <button
              className={styles.stay}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => openGuard(false)}
              ref={(el: Focusable | null) => { stayBtn.current = el; }}
            >
              {stayLabel}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.foot}>
        <button
          className={styles.back}
          type="button"
          aria-expanded={open}
          aria-controls="lgd-sheet"
          onClick={back}
          ref={(el: Focusable | null) => { backBtn.current = el; }}
        >
          <span className={styles.arrow} aria-hidden="true"><BackIcon /></span>
          {backLabel}
        </button>
        <button className={styles.next} type="button" onClick={() => setLive(false)}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
