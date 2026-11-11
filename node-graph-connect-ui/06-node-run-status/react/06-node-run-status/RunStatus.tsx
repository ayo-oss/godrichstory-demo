import { useRef, useState } from "react";
import styles from "./RunStatus.module.scss";

export type RunStatusProps = { duration?: number; easing?: string; color?: string };

/** ambient 의 useRef 는 T|null 을 돌려준다 — 배열 상자로 단언해 null 가드를 줄인다 */
type Box<T> = { current: T };

const CLOCK = (
  <svg className={styles.ic} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" /><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" /></svg>
);
const SPINNER = (
  <svg className={`${styles.ic} ${styles.icSpin}`} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" /><path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm88,88H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z" /></svg>
);
const CHECK = (
  <svg className={styles.ic} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" /><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" /></svg>
);
const WARN = (
  <svg className={styles.ic} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" /><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z" /></svg>
);

const CHIPS = [
  { key: "wait", cls: styles.chipWait, icon: CLOCK, text: "대기" },
  { key: "run", cls: styles.chipRun, icon: SPINNER, text: "실행 중" },
  { key: "done", cls: styles.chipDone, icon: CHECK, text: "성공" },
  { key: "fail", cls: styles.chipFail, icon: WARN, text: "실패" },
];

const TITLES = ["폼 접수", "AI 요약", "메일 보내기"];
const RESULT = ["done", "done", "fail"];
const LINE = { wait: "대기 중 · 3단계", run: "실행 중 · 3단계", end: "성공 2 · 실패 1" };
const CARD_CLASS = [styles.card1, styles.card2, styles.card3];

export default function RunStatus({ duration = 800, easing = "ease-out", color = "#2a5fd8" }: RunStatusProps) {
  const [demo, setDemo] = useState(true);
  const [states, setStates] = useState<string[]>(["wait", "wait", "wait"]);
  const [line, setLine] = useState<string>(LINE.wait);
  const timers = useRef<number[]>([]) as Box<number[]>;

  const runPipeline = () => {
    setDemo(false);
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    setStates(["wait", "wait", "wait"]);
    setLine(LINE.wait);
    TITLES.forEach((_, i) => {
      timers.current.push(setTimeout(() => {
        setStates((prev) => prev.map((v, j) => (j === i ? "run" : v)));
        if (i === 0) { setLine(LINE.run); }
      }, 300 + i * 600));
      timers.current.push(setTimeout(() => {
        setStates((prev) => prev.map((v, j) => (j === i ? RESULT[i] : v)));
        if (i === TITLES.length - 1) { setLine(LINE.end); }
      }, 1100 + i * 600));
    });
  };

  return (
    <main className={styles.stage}>
      <div
        className={`${styles.ng} ${demo ? styles.isDemo : ""}`}
        style={{ "--ng-duration": `${duration}ms`, "--ng-easing": easing, "--ng-color": color }}
      >
        <p className={styles.livewrap}>
          <span className={styles.live} aria-live="polite">{line}</span>
          <span className={styles.demolive} aria-hidden="true">
            <span className={styles.lstrip}>
              <span className={styles.lt}>{LINE.wait}</span>
              <span className={styles.lt}>{LINE.run}</span>
              <span className={styles.lt}>{LINE.end}</span>
            </span>
          </span>
        </p>

        <ul className={styles.list}>
          {TITLES.map((title, i) => (
            <li key={title} className={`${styles.card} ${CARD_CLASS[i]}`} data-state={states[i]}>
              <span className={styles.band} aria-hidden="true" />
              <span className={styles.title}>{title}</span>
              <span className={styles.chips} aria-hidden="true">
                <span className={styles.strip}>
                  {CHIPS.map((chip) => (
                    <span key={chip.key} className={`${styles.chip} ${chip.cls}`}>
                      {chip.icon}
                      <span className={styles.txt}>{chip.text}</span>
                    </span>
                  ))}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <button type="button" className={styles.run} onClick={runPipeline}>다시 실행</button>
      </div>
    </main>
  );
}
