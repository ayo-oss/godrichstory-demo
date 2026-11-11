// PomodoroRingTimer — vanilla 판(run/080/demo/03-pomodoro-ring-timer/index.html) 의 React 포트.
// 원판은 CSS 애니메이션(ptDrain)이 각도 변수 --pt-angle 을 깎아 그리고, 정지·재생은
// animation-play-state 하나로 한다. React 는 남은 초와 글자·aria-valuenow 만 맡는다.
// SPEED 는 데모용 빠른 모드다: 1 초에 60 초씩 줄어 25분이 25초에 끝난다. 실제 서비스에선 1 로 둔다.
// 화면 라벨은 늘 25:00 스케일 그대로다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PomodoroRingTimer.module.scss";

export type PomodoroRingTimerProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Phase = "focus" | "break";
type Clock = { left: number; last: number; timer: number };
type ClockBox = { current: Clock };      // ambient 의 useRef 는 T|null 을 돌려주므로 단언용
type DiscBox = { current: { style: { [k: string]: string }; offsetHeight: number } | null };

const KEY = "pomodoro080";
const SPEED = 60;
const FOCUS = 1500;
const BREAK = 300;
const START = "시작";
const PAUSE = "일시정지";
const RESET_LABEL = "처음으로";
const PHASE_FOCUS = "집중";
const PHASE_BREAK = "쉼";
const RING_LABEL = "남은 시간";

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
}

export default function PomodoroRingTimer({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#17141a",
}: PomodoroRingTimerProps) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [left, setLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [demo, setDemo] = useState(true);
  const clock = useRef<Clock>({ left: FOCUS, last: 0, timer: 0 }) as ClockBox;
  const disc = useRef<{ style: { [k: string]: string }; offsetHeight: number } | null>(null) as DiscBox;

  const total = phase === "focus" ? FOCUS : BREAK;

  function syncDisc(phaseTotal: number, rest: number) {
    const el = disc.current;
    if (!el) { return; }
    el.style.animationDuration = phaseTotal / SPEED + "s";
    el.style.animationDelay = "-" + (phaseTotal - rest) / SPEED + "s";
    el.style.animationName = "none";
    void el.offsetHeight;
    el.style.animationName = "";
  }

  function save(p: Phase, rest: number, on: boolean) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ phase: p, left: rest, running: on })); }
    catch (e) { /* 저장소가 막힌 창은 건너뛴다 */ }
  }

  // 흐르는 시간은 벽시계로 잰다 — 탭이 멈춰도 다음 틱에서 한 번에 따라잡는다
  useEffect(() => {
    if (!running) { return; }
    clock.current.last = Date.now();
    clock.current.timer = window.setInterval(() => {
      const now = Date.now();
      const c = clock.current;
      c.left = Math.max(0, c.left - ((now - c.last) / 1000) * SPEED);
      c.last = now;
      if (c.left <= 0) {
        setPhase((p) => {
          const next: Phase = p === "focus" ? "break" : "focus";
          c.left = next === "focus" ? FOCUS : BREAK;
          syncDisc(c.left, c.left);
          return next;
        });
      }
      setLeft(c.left);
    }, 200);
    return () => window.clearInterval(clock.current.timer);
  }, [running]);

  useEffect(() => { save(phase, left, running); }, [phase, left, running]);

  // 첫 렌더에서 저장된 상태를 되살린다
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (saved && typeof saved.left === "number") {
        const p: Phase = saved.phase === "break" ? "break" : "focus";
        const cap = p === "focus" ? FOCUS : BREAK;
        const rest = Math.min(Math.max(saved.left, 0), cap);
        clock.current.left = rest;
        setDemo(false);
        setPhase(p);
        setLeft(rest);
        syncDisc(cap, rest);
        setRunning(!!saved.running);
      }
    } catch (e) { /* 깨진 값은 무시하고 처음 상태로 */ }
  }, []);

  function toggle() {
    setDemo(false);
    syncDisc(total, clock.current.left);
    setRunning((on) => !on);
  }
  function reset() {
    setDemo(false);
    setRunning(false);
    clock.current.left = FOCUS;
    setPhase("focus");
    setLeft(FOCUS);
    syncDisc(FOCUS, FOCUS);
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };
  const rootCls = [
    styles.root,
    demo ? styles.isDemo : "",
    running ? styles.isRunning : "",
    phase === "break" ? styles.isBreak : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <div
          className={styles.ring}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((left / total) * 100)}
          aria-label={RING_LABEL}
        >
          <span className={styles.disc} ref={disc} aria-hidden="true" />
          <span className={styles.hole}>
            <span className={styles.timeWrap}>
              <b className={`${styles.time} ${styles.cut1}`}>{mmss(left)}</b>
              <b className={`${styles.time} ${styles.cut2}`} aria-hidden="true">12:30</b>
              <b className={`${styles.time} ${styles.cut3}`} aria-hidden="true">05:00</b>
            </span>
            <span className={styles.phaseWrap}>
              <span className={`${styles.phase} ${styles.phase1}`}>{phase === "focus" ? PHASE_FOCUS : PHASE_BREAK}</span>
              <span className={`${styles.phase} ${styles.phase2}`} aria-hidden="true">{PHASE_BREAK}</span>
            </span>
          </span>
        </div>
        <div className={styles.ctrls}>
          <button className={`${styles.btn} ${styles.btnGo}`} type="button" onClick={toggle}>
            {running ? PAUSE : START}
          </button>
          <button className={styles.btn} type="button" onClick={reset}>{RESET_LABEL}</button>
        </div>
      </div>
    </main>
  );
}
