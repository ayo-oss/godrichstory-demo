// RowExpand — vanilla 판(run/377/demo/01-row-expand/index.html) 의 React 포트.
// 배지가 완료 비율만큼 먼저 움츠러들고, 하위 작업 목록은 실제 scrollHeight 를 측정해 그 높이까지 펼쳐진다.
import { useEffect, useRef, useState } from "react";
import styles from "./RowExpand.module.scss";

type Box<T> = { current: T };

const BADGE_SHRINK_MAX = 0.22; // 배지 축소폭 상한 — 완료 비율이 낮을수록 더 작게 움츠러든다
const STEP_MS = 700; // 자동 루프에서 한 행이 열려 있는 시간

type Task = { title: string; subs: { text: string; done: boolean }[] };

const TASKS: Task[] = [
  { title: "주간 보고서 준비", subs: [{ text: "자료 취합", done: true }, { text: "차트 정리", done: false }, { text: "검토 요청", done: false }] },
  { title: "디자인 시스템 정리", subs: [{ text: "토큰 표 작성", done: true }, { text: "컴포넌트 목록", done: true }] },
  { title: "고객 응대 메일 회신", subs: [{ text: "문의 분류", done: false }, { text: "답변 초안", done: false }, { text: "담당자 확인", done: false }, { text: "발송", done: false }] },
];

function ratio(task: Task) {
  const done = task.subs.filter(function (s) { return s.done; }).length;
  return task.subs.length > 0 ? done / task.subs.length : 0;
}

export default function RowExpand() {
  const [isDemo, setIsDemo] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const subRefs = useRef([]) as unknown as Box<(HTMLDivElement | null)[]>;
  const cursorRef = useRef(0) as unknown as Box<number>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(function () {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setOpenIndex(null); return; }
    function autoStep() {
      setOpenIndex(cursorRef.current);
      cursorRef.current = (cursorRef.current + 1) % TASKS.length;
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, STEP_MS);
    return function () { window.clearInterval(timerRef.current); };
  }, []);

  useEffect(function () {
    if (openIndex === null) return;
    const el = subRefs.current[openIndex];
    if (el && el.firstElementChild) {
      el.style.setProperty("--h", (el.firstElementChild as HTMLElement).scrollHeight + "px");
    }
  }, [openIndex]);

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  function toggle(i: number) {
    human();
    setOpenIndex(function (cur) { return cur === i ? null : i; });
  }

  return (
    <main className={styles.stage}>
      <ul className={styles.list + (isDemo ? " " + styles.isDemo : "")}>
        {TASKS.map(function (task, i) {
          const open = openIndex === i;
          const done = task.subs.filter(function (s) { return s.done; }).length;
          const shrink = 1 - (1 - ratio(task)) * BADGE_SHRINK_MAX;
          return (
            <li className={styles.row} key={task.title}>
              <button
                className={styles.rowBtn}
                type="button"
                aria-expanded={open}
                aria-controls={"sub-" + i}
                onClick={function () { toggle(i); }}
              >
                <span className={styles.badge} style={{ transform: open ? "scale(" + shrink + ")" : "scale(1)" }}>
                  {done}/{task.subs.length}
                </span>
                <span className={styles.title}>{task.title}</span>
                <svg className={styles.caret} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} viewBox="0 0 256 256" aria-hidden="true">
                  <g fill="currentColor">
                    <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
                    <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
                  </g>
                </svg>
              </button>
              <div
                className={styles.subWrap + (open ? " " + styles.open : "")}
                id={"sub-" + i}
                role="group"
                aria-label="하위 작업"
                ref={function (el: HTMLDivElement | null) { subRefs.current[i] = el; }}
              >
                <ul className={styles.subList}>
                  {task.subs.map(function (s) {
                    return <li key={s.text} className={s.done ? styles.done : ""}>{s.text}</li>;
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
