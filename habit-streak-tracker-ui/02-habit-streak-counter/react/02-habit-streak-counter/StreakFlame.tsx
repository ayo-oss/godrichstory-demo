// StreakFlame — vanilla 판(run/297/demo/02-habit-streak-counter/index.html) 의 React 포트.
// 불꽃 크기는 연속 일수를 그대로 쓰지 않고 네 단계로만 커진다. 값·수치는 vanilla 와 같다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StreakFlame.module.scss";

export type StreakFlameProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--i"?: string };
type State = { streak: number; best: number };

const STORE = "godrich-habit-streak";
const UNIT_TEXT = "일 연속";
const BEST_TEXT = "최장 {b}일";
const SAY_ON = "{n}일 연속입니다";
const SAY_OFF = "연속이 끊겼습니다. 최장 기록은 {b}일";
const GO_TEXT = "오늘 체크";
const CUT_TEXT = "연속 끊기";

// 불꽃 크기는 네 단계뿐이다 — 연속 일수를 그대로 scale 에 넣으면 100일에 화면을 덮는다
function stepOf(n: number): number {
  return n >= 30 ? 4 : n >= 14 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0;
}

export default function StreakFlame({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
}: StreakFlameProps) {
  const [state, setState] = useState<State>({ streak: 12, best: 21 });
  const [broken, setBroken] = useState(false);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setState(JSON.parse(raw) as State); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본값 그대로 간다 */ }
  }, []);

  function save(next: State) {
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function check() {
    setDemo(false);
    const streak = state.streak + 1;
    const next: State = { streak: streak, best: Math.max(streak, state.best) };
    setState(next);
    setBroken(false);
    save(next);
  }
  function cut() {
    setDemo(false);
    const next: State = { streak: 0, best: state.best };
    setState(next);
    setBroken(true);
    save(next);
  }

  const sizeClass = [styles.s0, styles.s1, styles.s2, styles.s3, styles.s4];
  const say = broken
    ? SAY_OFF.replace("{b}", String(state.best))
    : SAY_ON.replace("{n}", String(state.streak));
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const dotVars = (i: number): DotVars => ({ "--i": String(i) });

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-fire" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 144a80 80 0 0 1-160 0c0-30.57 14.42-58.26 31-80l33 32l26.27-72C159.86 41.92 208 88.15 208 144" opacity=".2"/><path d="M183.89 153.34a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68ZM216 144a88 88 0 0 1-176 0c0-27.92 11-56.47 32.66-84.85a8 8 0 0 1 11.93-.89l24.12 23.41l22-60.41a8 8 0 0 1 12.63-3.41C165.21 36 216 84.55 216 144m-16 0c0-46.09-35.79-85.92-58.21-106.33l-22.27 61.07a8 8 0 0 1-13.09 3L80.06 76.16C64.09 99.21 56 122 56 144a72 72 0 0 0 144 0"/></g></symbol>
          <symbol id="ico-check-circle" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <div className={styles.top}>
          <span className={styles.flameBox}>
            <span className={styles.halo} aria-hidden="true" />
            <svg className={`${styles.flame} ${sizeClass[stepOf(state.streak)]}`} aria-hidden="true">
              <use href="#ico-fire" />
            </svg>
          </span>
          <p className={styles.read}>
            <b className={styles.num}>{state.streak}</b>
            <span className={styles.unit}>{UNIT_TEXT}</span>
            <span className={styles.best}>{BEST_TEXT.replace("{b}", String(state.best))}</span>
          </p>
        </div>
        <p className={styles.week} aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <i className={styles.dot} key={i} style={dotVars(i)} />
          ))}
        </p>
        <p className={styles.say} role="status" aria-live="polite">{say}</p>
        <div className={styles.bar}>
          <button className={styles.go} type="button" onClick={check}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-check-circle" /></svg>
            <span>{GO_TEXT}</span>
          </button>
          <button className={styles.cut} type="button" onClick={cut}>{CUT_TEXT}</button>
        </div>
      </div>
    </main>
  );
}
