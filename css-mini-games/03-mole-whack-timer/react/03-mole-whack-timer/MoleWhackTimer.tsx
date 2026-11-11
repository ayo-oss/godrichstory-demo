// MoleWhackTimer — vanilla 판(run/301/demo/03-mole-whack-timer/index.html) 의 React 포트.
// 3×3 구멍에 무작위로(700~1000ms 간격) 두더지가 솟고, 솟아 있는 동안 pointerdown 하면 점수.
// 제한 시간 20초. 최고 점수는 p301-03-best.
// 솟고 들어가는 움직임은 CSS(transition / .is-demo 에서는 @keyframes)가 그리고 React 는 상태만 바꾼다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MoleWhackTimer.module.scss";

export type MoleWhackTimerProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type TimerBox = { current: number };        // ambient 의 useRef 는 T|null 을 돌려주므로 단언용
type HitBox = { current: number[] };
// ambient.d.ts 가 React 이벤트 제네릭을 안 주므로 로컬 타입로 쓴다(237 계열)
type PointerEvt = { target: { closest: (s: string) => HTMLElement | null } };
type KeyEvt = { key: string; preventDefault(): void; target: { closest: (s: string) => HTMLElement | null } };

const KEY = "p301-03-best";
const TIME = 20000;   // 제한 시간 20초 (ms)
const UP_MS = 850;    // 두더지가 올라와 있는 시간 (ms)
const HOLES = 9;
const TITLE = "두더지 잡기";
const BEST_LABEL = "최고 기록";
const RESTART_LABEL = "다시 시작";
const HOLE_LABEL = "{n}번 구멍";
const UNIT_SEC = "초";
const UNIT_PTS = "점";
const END_TEXT = "게임 끝! 점수 {n} · 최고 {b}";
const START = "시작";
const AGAIN = "다시";

// Phosphor Duotone(무료 아이콘 세트) 경로 — [20% 채움 경로, 본 경로]
const MOLE_PATHS: [string, string] = [
  "M208 188a44 44 0 0 1-80 25.3a44 44 0 1 1-63.71-59.48a64 64 0 0 1 127.42 0A43.9 43.9 0 0 1 208 188",
  "M112 164a12 12 0 1 1-12-12a12 12 0 0 1 12 12m44-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m60 36a52 52 0 0 1-88 37.52a52 52 0 1 1-71.28-75.72A71.6 71.6 0 0 1 63 129C44 91.1 32.53 40.76 45.64 19.08A22 22 0 0 1 65.06 8c14.12 0 26 11.89 36.44 36.36c6.22 14.62 10.85 31.32 14 44.74a71.8 71.8 0 0 1 25 0c3.13-13.42 7.76-30.12 14-44.74C164.9 19.89 176.82 8 190.94 8a22 22 0 0 1 19.42 11.08C223.47 40.76 212 91.1 193 129a71.6 71.6 0 0 1 6.26 20.76A51.77 51.77 0 0 1 216 188m-60.11-94.37a71.7 71.7 0 0 1 26.88 19.64a218.5 218.5 0 0 0 14.83-46.19c3.49-18.13 3.15-33-.93-39.72a6 6 0 0 0-5.73-3.36c-6.61 0-14.52 9.7-21.72 26.62c-5.93 13.94-10.35 30.12-13.33 43.01m-82.66 19.64a71.7 71.7 0 0 1 26.88-19.64c-3-12.89-7.4-29.07-13.33-43C79.58 33.7 71.67 24 65.06 24a6 6 0 0 0-5.73 3.36C55.25 34.1 54.91 49 58.4 67.08a218.5 218.5 0 0 0 14.83 46.19M200 188a35.87 35.87 0 0 0-13.34-28a8 8 0 0 1-2.92-5.45a56 56 0 0 0-111.48 0a8 8 0 0 1-2.92 5.45a36 36 0 1 0 47.28 54.21l-9.74-8.09a8 8 0 1 1 10.24-12.3L128 202.9l10.88-9.05a8 8 0 1 1 10.24 12.3l-9.74 8.09A36 36 0 0 0 200 188",
];
const TROPHY_PATHS: [string, string] = [
  "M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z",
  "M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z",
];
const RESTART_PATHS: [string, string] = [
  "M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88",
  "M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0",
];
const TIMER_PATHS: [string, string] = [
  "M216 136a88 88 0 1 1-88-88a88 88 0 0 1 88 88",
  "M128 40a96 96 0 1 0 96 96a96.11 96.11 0 0 0-96-96m0 176a80 80 0 1 1 80-80a80.09 80.09 0 0 1-80 80m45.66-125.66a8 8 0 0 1 0 11.32l-40 40a8 8 0 0 1-11.32-11.32l40-40a8 8 0 0 1 11.32 0M96 16a8 8 0 0 1 8-8h48a8 8 0 0 1 0 16h-48a8 8 0 0 1-8-8",
];

function DuotoneIcon({ paths }: { paths: [string, string] }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d={paths[0]} opacity=".2" />
        <path d={paths[1]} />
      </g>
    </svg>
  );
}

export default function MoleWhackTimer({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  accentColor = "#fff7e6",
}: MoleWhackTimerProps) {
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [up, setUp] = useState(-1);
  const [hitIndex, setHitIndex] = useState(-1);
  const [best, setBest] = useState(0);
  const [demo, setDemo] = useState(true);
  const [left, setLeft] = useState(TIME);
  const [endText, setEndText] = useState<string | null>(null);
  const [again, setAgain] = useState(false);
  const playingRef = useRef(false) as { current: boolean };
  const upRef = useRef(-1) as TimerBox;
  const lastHoleRef = useRef(-1) as TimerBox;
  const scoreRef = useRef(0) as TimerBox;
  const endAtRef = useRef(0) as TimerBox;
  const bestRef = useRef(0) as TimerBox;
  const tickRef = useRef(0) as TimerBox;
  const spawnRef = useRef(0) as TimerBox;
  const downRef = useRef(0) as TimerBox;
  const hitTimersRef = useRef<number[]>([]) as HitBox;
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };

  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem(KEY)) || 0;
      if (v) { bestRef.current = v; setBest(v); }
    } catch (e) { /* 저장소가 막힌 창은 기본값 그대로 */ }
    return () => { clearAll(); };
  }, []);

  function clearAll() {
    window.clearInterval(tickRef.current);
    window.clearTimeout(spawnRef.current);
    window.clearTimeout(downRef.current);
    hitTimersRef.current.forEach((t) => window.clearTimeout(t));
    tickRef.current = 0; spawnRef.current = 0; downRef.current = 0;
    hitTimersRef.current = [];
  }
  function sink() {
    if (downRef.current) { window.clearTimeout(downRef.current); downRef.current = 0; }
    if (upRef.current >= 0) { upRef.current = -1; setUp(-1); }
  }
  function spawn() {
    if (!playingRef.current) { return; }
    sink();
    let i = lastHoleRef.current;
    while (i === lastHoleRef.current) { i = Math.floor(Math.random() * HOLES); }   // 같은 구멍 연속 스폰은 피한다
    lastHoleRef.current = i; upRef.current = i; setUp(i);
    downRef.current = window.setTimeout(sink, UP_MS);
    spawnRef.current = window.setTimeout(spawn, 700 + Math.random() * 300);
  }
  function tick() {
    const remain = endAtRef.current - Date.now();
    if (remain <= 0) { finish(); return; }
    setLeft(remain);
  }
  function finish() {
    playingRef.current = false;
    clearAll(); sink();
    setLeft(0);
    const s = scoreRef.current;
    let b = bestRef.current;
    if (s > b) {
      b = s; bestRef.current = b; setBest(b);
      try { window.localStorage.setItem(KEY, String(b)); } catch (e) { /* 저장 건너뛰기 */ }
    }
    setEndText(END_TEXT.replace("{n}", String(s)).replace("{b}", String(b)));
    setAgain(true);
    setPlaying(false);
    if (startBtnRef.current) { startBtnRef.current.focus({ preventScroll: true }); }   // iframe 안에서 부모 스크롤 방지
  }
  function start() {
    setDemo(false);
    playingRef.current = true; scoreRef.current = 0; lastHoleRef.current = -1;
    setScore(0); setLeft(TIME); setEndText(null); setPlaying(true);
    endAtRef.current = Date.now() + TIME;
    tickRef.current = window.setInterval(tick, 100);
    spawnRef.current = window.setTimeout(spawn, 350);
  }
  function hit(i: number) {
    if (!playingRef.current || i !== upRef.current) { return; }   // 안 올라와 있는 구멍 — 중복·빈 클릭 방지
    upRef.current = -1;
    if (downRef.current) { window.clearTimeout(downRef.current); downRef.current = 0; }
    scoreRef.current += 1; setScore(scoreRef.current);
    setUp(-1); setHitIndex(i);
    hitTimersRef.current.push(window.setTimeout(() => setHitIndex(-1), 380));
  }
  function reset() {
    setDemo(false);
    playingRef.current = false;
    clearAll(); sink();
    scoreRef.current = 0; setScore(0); setLeft(TIME);
    setEndText(null); setAgain(false); setPlaying(false);
  }
  function onFieldPointerDown(e: PointerEvt) {
    setDemo(false);
    const btn = e.target.closest ? e.target.closest("button") : null;
    if (btn) { hit(Number(btn.getAttribute("data-i"))); }
  }
  function onFieldKeyDown(e: KeyEvt) {
    if (e.key !== "Enter" && e.key !== " ") { return; }
    const btn = e.target.closest ? e.target.closest("button") : null;
    if (btn) { e.preventDefault(); hit(Number(btn.getAttribute("data-i"))); }
  }

  const rootCls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const holeCls = (i: number) => (
    [styles.hole, up === i ? styles.isUp : "", hitIndex === i ? styles.isHit : ""].filter(Boolean).join(" ")
  );

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <header className={styles.bar}>
          <p className={styles.title}>{TITLE}</p>
          <span className={styles.best} aria-label={BEST_LABEL}>
            <svg className={styles.trophy} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor"><path d={TROPHY_PATHS[0]} opacity=".2" /><path d={TROPHY_PATHS[1]} /></g>
            </svg>
            <b className={styles.num}>{best}</b>
          </span>
          <button className={styles.restart} type="button" aria-label={RESTART_LABEL} onClick={reset}>
            <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor"><path d={RESTART_PATHS[0]} opacity=".2" /><path d={RESTART_PATHS[1]} /></g>
            </svg>
          </button>
        </header>
        <div className={styles.meter}>
          <span className={styles.clock}>
            <svg className={styles.timer} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor"><path d={TIMER_PATHS[0]} opacity=".2" /><path d={TIMER_PATHS[1]} /></g>
            </svg>
            <b className={styles.num}>{(left / 1000).toFixed(1)}</b><span className={styles.unit}>{UNIT_SEC}</span>
          </span>
          <span className={styles.track}>
            <span className={styles.fill} style={{ transform: `scaleX(${left / TIME})` }}></span>
          </span>
          <span className={styles.score}>
            <b className={[styles.num, styles.numScore].join(" ")}>{score}</b><span className={styles.unit}>{UNIT_PTS}</span>
          </span>
        </div>
        <div className={styles.field} onPointerDown={onFieldPointerDown} onKeyDown={onFieldKeyDown}>
          {Array.from({ length: HOLES }, (_, i) => (
            <button className={holeCls(i)} type="button" key={i} data-i={i}
                    aria-label={HOLE_LABEL.replace("{n}", String(i + 1))} style={{ "--i": i } as Vars}>
              <span className={styles.window}>
                <span className={styles.mole}><DuotoneIcon paths={MOLE_PATHS} /></span>
              </span>
              <span className={styles.rim} aria-hidden="true"></span>
              <span className={styles.flash} aria-hidden="true"></span>
            </button>
          ))}
          {!playing && (
            <div className={styles.veil}>
              {endText && <p className={styles.veilMsg} role="status"><b>{endText}</b></p>}
              <button className={styles.start} type="button" ref={startBtnRef} onClick={start}>
                {again ? AGAIN : START}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
