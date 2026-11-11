// ReminderPicker — vanilla 판(run/297/demo/07-habit-reminder-picker/index.html) 의 React 포트.
// 고른 시각이 오늘 이미 지났으면 내일 같은 시각까지를 센다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ReminderPicker.module.scss";

export type ReminderPickerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChipVars = CSSProperties & { "--i"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const STORE = "godrich-habit-reminder";
const TIMES = ["06:00", "07:30", "12:00", "18:30", "21:30"];
const TITLE = "리마인더";
const SWITCH_TEXT = "알림 켜기";
const CHIP_LABEL = "{t} 알림";
const LEFT_TEXT = "다음 알림까지 {h}시간 {m}분";
const OFF_TEXT = "알림이 꺼져 있습니다";

// 고른 시각이 오늘 이미 지났으면 내일 같은 시각까지를 센다
function minutesLeft(hhmm: string): number {
  const parts = hhmm.split(":");
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(parts[0]), Number(parts[1]), 0, 0);
  const diff = Math.round((at.getTime() - now.getTime()) / 60000);
  return diff <= 0 ? diff + 24 * 60 : diff;
}

export default function ReminderPicker({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: ReminderPickerProps) {
  const [pick, setPick] = useState(1);
  const [on, setOn] = useState(true);
  const [now, setNow] = useState(0);
  const [demo, setDemo] = useState(true);
  const timerRef = useRef<number>(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw) as { pick: number; on: boolean };
        setPick(saved.pick);
        setOn(saved.on);
      }
    } catch (e) { /* 저장소가 막힌 창에서는 기본값 그대로 */ }
    timerRef.current = window.setInterval(() => setNow((n) => n + 1), 30000);
    return () => { window.clearInterval(timerRef.current); };
  }, []);

  function save(nextPick: number, nextOn: boolean) {
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ pick: nextPick, on: nextOn }));
    } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function choose(i: number) {
    setDemo(false);
    setPick(i);
    save(i, on);
  }
  function flip() {
    setDemo(false);
    setOn(!on);
    save(pick, !on);
  }

  const left = minutesLeft(TIMES[pick]);
  const say = on
    ? LEFT_TEXT.replace("{h}", String(Math.floor(left / 60))).replace("{m}", String(left % 60))
    : OFF_TEXT;
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const chipVars = (i: number): ChipVars => ({ "--i": String(i) });
  void now;   // 30초마다 다시 그리게 하는 값 — 표시는 minutesLeft 가 그때 다시 계산한다

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-bell" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2"/><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216M48 184c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.head}>
            <p className={styles.title}>
              <svg className={styles.bell} aria-hidden="true"><use href="#ico-bell" /></svg>
              <span>{TITLE}</span>
            </p>
            <span className={styles.swWrap}>
              <span className={styles.swText}>{SWITCH_TEXT}</span>
              <button
                className={styles.switch}
                type="button"
                role="switch"
                aria-checked={on ? "true" : "false"}
                aria-label={SWITCH_TEXT}
                onClick={flip}
              >
                <span className={styles.knob} aria-hidden="true" />
              </button>
            </span>
          </div>
          <div className={styles.chips}>
            {TIMES.map((t, i) => (
              <button
                className={styles.chip}
                key={t}
                type="button"
                aria-pressed={i === pick ? "true" : "false"}
                aria-label={CHIP_LABEL.replace("{t}", t)}
                style={chipVars(i)}
                onClick={() => choose(i)}
              >
                {t}
              </button>
            ))}
          </div>
          <p className={styles.say} role="status" aria-live="polite">{say}</p>
        </div>
      </div>
    </main>
  );
}
