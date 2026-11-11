// OxQuizPanel — vanilla 판(run/080/demo/07-ox-quiz-panel/index.html) 의 React 포트.
// 문장 5개를 O/X 로 판정한다. 정답이면 고른 쪽이 파란 면, 오답이면 붉은 면 + 정답 쪽 힌트 테두리.
// 900ms 뒤 다음 문장으로 넘어가고, 다 풀면 한 번 더 누를 때 처음으로 돌아간다.
// 진행 점의 번호는 CSS counter-increment 가 세므로 컴포넌트는 색만 바꾼다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OxQuizPanel.module.scss";

export type OxQuizPanelProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Side = "O" | "X";
type Mark = "hit" | "miss" | null;
type KeyEvt = { key: string; preventDefault(): void };   // React 제네릭 대신 로컬 타입
type TimerBox = { current: number[] };                   // ambient 의 useRef 는 T|null 을 돌려준다

const QUESTIONS: { t: string; a: Side }[] = [
  { t: "CSS 의 transform 은 레이아웃을 다시 계산한다", a: "X" },
  { t: "prefers-reduced-motion 은 움직임 줄이기 요청이다", a: "O" },
  { t: "z-index 는 position 이 static 이면 듣지 않는다", a: "O" },
  { t: "gap 은 flex 에서는 쓸 수 없다", a: "X" },
  { t: "aria-pressed 는 눌림 상태를 알려 주는 속성이다", a: "O" },
];
const TITLE = "OX 퀴즈";
const SCORE_LABEL = "점수";
const O_LABEL = "맞다";
const X_LABEL = "아니다";
const GHOST_Q = "prefers-reduced-motion 은 움직임 줄이기 요청이다";
const HIT = "정답!";
const MISS = "아쉬워요";
const DONE = "끝! 5문제 중 {n}개 정답";
const HELP = "O 와 X 키로도 답합니다";

export default function OxQuizPanel({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  accentColor = "#0a4fe8",
}: OxQuizPanelProps) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<Side | null>(null);
  const [ok, setOk] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([null, null, null, null, null]);
  const [msg, setMsg] = useState(HELP);
  const [demo, setDemo] = useState(true);
  const lockRef = useRef(false);
  const timersRef = useRef<number[]>([]) as TimerBox;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };

  useEffect(() => {
    return () => { timersRef.current.forEach((t) => window.clearTimeout(t)); };
  }, []);

  function pick(v: Side) {
    if (lockRef.current) { return; }
    setDemo(false);
    if (step >= QUESTIONS.length) {
      setStep(0); setScore(0); setPicked(null); setMsg(HELP);
      setMarks([null, null, null, null, null]);
      return;
    }
    lockRef.current = true;
    const hit = QUESTIONS[step].a === v;
    setPicked(v);
    setOk(hit);
    setMsg(hit ? HIT : MISS);
    if (hit) { setScore(score + 1); }
    setMarks((prev) => prev.map((m, i) => (i === step ? (hit ? "hit" : "miss") : m)));
    timersRef.current.push(window.setTimeout(() => {
      const next = step + 1;
      setPicked(null);
      setStep(next);
      lockRef.current = false;
      setMsg(next >= QUESTIONS.length
        ? DONE.replace("{n}", String(hit ? score + 1 : score))
        : HELP);
    }, 900));
  }

  useEffect(() => {
    const onKey = (e: KeyEvt) => {
      const k = String(e.key).toLowerCase();
      if (k !== "o" && k !== "x") { return; }
      e.preventDefault();
      pick(k === "o" ? "O" : "X");
    };
    document.addEventListener("keydown", onKey as unknown as EventListener);
    return () => { document.removeEventListener("keydown", onKey as unknown as EventListener); };
  });

  const answer: Side | null = step < QUESTIONS.length ? QUESTIONS[step].a : null;
  const btnCls = (side: Side): string => [
    styles.btn,
    side === "O" ? styles.btnO : styles.btnX,
    picked === side ? (ok ? styles.isHit : styles.isMiss) : "",
    picked && !ok && answer === side ? styles.isHint : "",
  ].filter(Boolean).join(" ");
  const dotCls = (i: number): string => [
    styles.dot,
    i === step ? styles.isNow : "",
    marks[i] === "hit" ? styles.isHit : "",
    marks[i] === "miss" ? styles.isMiss : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={[styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
        <header className={styles.bar}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.score}>
            <span className={styles.scoreLabel}>{SCORE_LABEL}</span>{" "}
            <b className={styles.scoreNum}>{score}</b><span className={styles.scoreMax}>/5</span>
          </p>
        </header>

        <div className={styles.card}>
          <p className={styles.q}>{step < QUESTIONS.length ? QUESTIONS[step].t : QUESTIONS[0].t}</p>
          <p className={`${styles.q} ${styles.qGhost}`} aria-hidden="true">{GHOST_Q}</p>
        </div>

        <div className={styles.btns}>
          <button className={btnCls("O")} type="button" aria-pressed={picked === "O" ? "true" : "false"}
                  aria-label={O_LABEL} onClick={() => pick("O")}>O</button>
          <button className={btnCls("X")} type="button" aria-pressed={picked === "X" ? "true" : "false"}
                  aria-label={X_LABEL} onClick={() => pick("X")}>X</button>
        </div>

        <ol className={styles.dots}>
          {marks.map((m, i) => (<li key={i} className={dotCls(i)} />))}
        </ol>

        <p className={styles.msg} role="status">{msg}</p>
      </div>
    </main>
  );
}
