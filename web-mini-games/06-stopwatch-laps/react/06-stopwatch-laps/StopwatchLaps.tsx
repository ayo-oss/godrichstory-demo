// StopwatchLaps — vanilla 판(run/080/demo/06-stopwatch-laps/index.html) 의 React 포트.
// 시계는 requestAnimationFrame 한 줄기, 화면 글자는 그 값을 0.01초로 자른 것.
// 경과시간·랩·랩 번호는 키 하나(p080-06-stopwatch)에 JSON 으로 묶어 저장한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StopwatchLaps.module.scss";

export type StopwatchLapsProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type NumBox = { current: number };
type Lap = { n: number; at: string };

const KEY = "p080-06-stopwatch";
const START = "시작";
const STOP = "정지";
const LAP = "랩";
const RESET = "초기화";
const LAP_NO = "{n}번째";
const MAX = 4;
const SLOW_REEL = "01234567890";
const FAST_REEL = "012345678901234567890";

function pad(n: number): string { return (n < 10 ? "0" : "") + n; }
function fmt(ms: number): string {
  return pad(Math.floor(ms / 60000)) + ":" + pad(Math.floor(ms / 1000) % 60) + "." + pad(Math.floor(ms / 10) % 100);
}

export default function StopwatchLaps({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#0a4fe8",
}: StopwatchLapsProps) {
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [demo, setDemo] = useState(true);
  const baseRef = useRef(0) as NumBox;
  const startRef = useRef(0) as NumBox;
  const rafRef = useRef(0) as NumBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };
  const text = fmt(elapsed);

  function save(ms: number, list: Lap[], no: number) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ elapsed: Math.round(ms), count: no, laps: list }));
    } catch (e) { /* 저장소가 막힌 창은 건너뛴다 */ }
  }

  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(KEY) || "{}");
      const list: Lap[] = ([] as Lap[]).concat(raw.laps || []).slice(0, MAX);
      setElapsed(Number(raw.elapsed) || 0);
      setLaps(list);
      setCount(Number(raw.count) || list.length);
    } catch (e) { /* 못 읽으면 0 부터 */ }
  }, []);

  useEffect(() => {
    if (!running) { return; }
    let alive = true;
    const step = () => {
      if (!alive) { return; }
      setElapsed(baseRef.current + (Date.now() - startRef.current));
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
    return () => { alive = false; window.cancelAnimationFrame(rafRef.current); };
  }, [running]);

  function onToggle() {
    setDemo(false);
    if (running) { setRunning(false); save(elapsed, laps, count); return; }
    baseRef.current = elapsed;
    startRef.current = Date.now();
    setRunning(true);
  }
  function onLap() {
    setDemo(false);
    const no = count + 1;
    const list = ([{ n: no, at: fmt(elapsed) }] as Lap[]).concat(laps).slice(0, MAX);
    setCount(no); setLaps(list); setFresh(no);
    save(elapsed, list, no);
  }
  function onReset() {
    setDemo(false);
    baseRef.current = 0;
    setRunning(false); setElapsed(0); setLaps([]); setCount(0); setFresh(0);
    save(0, [], 0);
  }

  useEffect(() => {
    function onKey(e: KeyEvt) {
      const k = (e.key || "").toLowerCase();
      if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); onToggle(); }
      if (k === "l") { e.preventDefault(); onLap(); }
      if (k === "r") { e.preventDefault(); onReset(); }
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  });

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const ghost: Lap[] = [{ n: 3, at: "00:00.62" }, { n: 2, at: "00:00.41" }, { n: 1, at: "00:00.18" }];
  const ghostCls = [styles.g1, styles.g2, styles.g3];

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars}>
        <p className={styles.time} role="timer" aria-live="off">
          <span className={styles.main}>{text.slice(0, 5)}</span>
          <span className={styles.sep}>.</span>
          <span className={styles.cs}>
            {text.slice(6)}
            <span className={styles.reels} aria-hidden="true">
              <span className={styles.reel}>
                <span className={styles.reelInner}>
                  {SLOW_REEL.split("").map((d, i) => (<span className={styles.reelDigit} key={i}>{d}</span>))}
                </span>
              </span>
              <span className={`${styles.reel} ${styles.reelFast}`}>
                <span className={styles.reelInner}>
                  {FAST_REEL.split("").map((d, i) => (<span className={styles.reelDigit} key={i}>{d}</span>))}
                </span>
              </span>
            </span>
          </span>
        </p>
        <div className={styles.acts}>
          <button className={styles.btn} type="button" aria-keyshortcuts="Space" onClick={onToggle}>
            {running ? STOP : START}
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} type="button" aria-keyshortcuts="L" onClick={onLap}>{LAP}</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} type="button" aria-keyshortcuts="R" onClick={onReset}>{RESET}</button>
        </div>
        <div className={styles.lapBox}>
          <ul className={styles.laps}>
            {laps.map((l) => (
              <li className={[styles.lap, l.n === fresh ? styles.isNew : ""].filter(Boolean).join(" ")} key={l.n}>
                <b className={styles.lapNo}>{LAP_NO.replace("{n}", String(l.n))}</b>
                <span className={styles.lapAt}>{l.at}</span>
              </li>
            ))}
          </ul>
          <ul className={`${styles.laps} ${styles.lapsGhost}`} aria-hidden="true">
            {ghost.map((l, i) => (
              <li className={`${styles.lap} ${ghostCls[i]}`} key={l.n}>
                <b className={styles.lapNo}>{LAP_NO.replace("{n}", String(l.n))}</b>
                <span className={styles.lapAt}>{l.at}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
