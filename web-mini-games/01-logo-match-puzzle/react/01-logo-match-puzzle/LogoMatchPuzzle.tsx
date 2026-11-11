// LogoMatchPuzzle — vanilla 판(run/080/demo/01-logo-match-puzzle/index.html) 의 React 포트.
// 진열 카드의 기하 마크와 같은 모양을 보기 넷에서 고른다. 마크는 전부 CSS 도형이라 이미지가 0이다.
// 상태는 훅이 들고(문제 번호·점수·고른 칸·끝남), 도형과 연출은 CSS 가 그린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogoMatchPuzzle.module.scss";

export type LogoMatchPuzzleProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ShapeKey = "hex" | "wedge" | "chevron" | "ring" | "diamond" | "tri";
type Question = { answer: ShapeKey; tiles: ShapeKey[] };
type KeyEvt = { key: string; preventDefault(): void };
type TimerBox = { current: number };   // ambient 의 useRef 는 T|null 을 돌려주므로 단언용

const NEXT_MS = 800;
const Q_LABEL = "문제";
const Q_OF = "/ 5";
const SCORE_LABEL = "맞은 수";
const TILE_LABEL = "보기 {n}";
const AGAIN_LABEL = "새 문제";
const DONE_TEXT = "5문제 중 {n}개 정답";

const QUESTIONS: Question[] = [
  { answer: "hex", tiles: ["wedge", "hex", "chevron", "ring"] },
  { answer: "chevron", tiles: ["chevron", "diamond", "ring", "tri"] },
  { answer: "wedge", tiles: ["tri", "ring", "wedge", "hex"] },
  { answer: "diamond", tiles: ["hex", "chevron", "tri", "diamond"] },
  { answer: "ring", tiles: ["diamond", "wedge", "ring", "chevron"] },
];

export default function LogoMatchPuzzle({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  accentColor = "#0a4fe8",
}: LogoMatchPuzzleProps) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [done, setDone] = useState(false);
  const [demo, setDemo] = useState(true);
  const timer = useRef<number>(0) as TimerBox;

  const question = QUESTIONS[qIndex];

  function pick(i: number) {
    if (picked >= 0 || done) { return; }
    setDemo(false);
    setPicked(i);
    if (question.tiles[i] === question.answer) { setScore((s) => s + 1); }
    timer.current = window.setTimeout(() => {
      setPicked(-1);
      if (qIndex + 1 >= QUESTIONS.length) { setDone(true); }
      else { setQIndex((n) => n + 1); }
    }, NEXT_MS);
  }

  function again() {
    setQIndex(0);
    setScore(0);
    setPicked(-1);
    setDone(false);
  }

  useEffect(() => {
    const onKey = (e: KeyEvt) => {
      const n = "1234".indexOf(e.key);
      if (n >= 0) { e.preventDefault(); pick(n); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };
  const rootCls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  function tileCls(i: number) {
    if (picked < 0) { return styles.tile; }
    const isAnswer = question.tiles[i] === question.answer;
    if (isAnswer) { return `${styles.tile} ${styles.isCorrect}`; }
    return i === picked ? `${styles.tile} ${styles.isWrong}` : styles.tile;
  }

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <header className={styles.bar}>
          <p className={styles.q}>
            <span className={styles.qLabel}>{Q_LABEL}</span>
            <b className={styles.qNum}>{qIndex + 1}</b>
            <span className={styles.qOf}>{Q_OF}</span>
          </p>
          <div className={styles.scoreWrap}>
            <p className={styles.score} aria-live="polite">
              <span className={styles.scoreLabel}>{SCORE_LABEL}</span>
              <b className={styles.scoreNum}>{score}</b>
            </p>
            <span className={styles.plus} aria-hidden="true">+1</span>
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.card}>
            <span className={`${styles.mark} ${styles.markBig} ${styles.cut1}`} data-shape={question.answer} aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markBig} ${styles.cut2}`} data-shape="wedge" aria-hidden="true" />
            <span className={`${styles.mark} ${styles.markBig} ${styles.cut3}`} data-shape="ring" aria-hidden="true" />
          </div>
          <div className={styles.tiles}>
            {question.tiles.map((shape, i) => (
              <button
                key={`${qIndex}-${i}`}
                className={tileCls(i)}
                type="button"
                aria-label={TILE_LABEL.replace("{n}", String(i + 1))}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => pick(i)}
              >
                <span className={styles.mark} data-shape={shape} aria-hidden="true" />
                <span className={styles.tileKey} aria-hidden="true">{i + 1}</span>
              </button>
            ))}
            <span className={styles.ring} aria-hidden="true" />
          </div>
        </div>
        {done ? (
          <p className={styles.done} role="status">
            <b className={styles.doneMsg}>{DONE_TEXT.replace("{n}", String(score))}</b>
            <button className={styles.again} type="button" onClick={again}>{AGAIN_LABEL}</button>
          </p>
        ) : null}
      </div>
    </main>
  );
}
