// ActivityTimeline — vanilla 판(run/377/demo/08-activity-timeline/index.html) 의 React 포트.
// 계산 겹: 첫 점·마지막 점의 실제 화면 좌표 차이로 세로선 길이를 정하고, 되감기는 역순 인덱스로
// 지연을 계산한다(오래된 항목일수록 나중에 사라진다).
import { useEffect, useRef, useState } from "react";
import styles from "./ActivityTimeline.module.scss";

type Box<T> = { current: T };

const STAGGER_MS = 90;

const LOG = [
  { time: "09:12", text: "아침 스트레칭 완료" },
  { time: "09:40", text: "이메일 확인 완료" },
  { time: "10:05", text: "주간 보고서 제출" },
  { time: "11:20", text: "팀 스탠드업 참여" },
  { time: "13:00", text: "점심 식단 기록" },
];

type Entry = { time: string; text: string; state: "in" | "out" };

export default function ActivityTimeline() {
  const [isDemo, setIsDemo] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [line, setLine] = useState({ top: 0, height: 0, scale: 0 });
  const [liveNote, setLiveNote] = useState("");
  const dotRefs = useRef([]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const timelineRef = useRef(null) as unknown as Box<HTMLOListElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  function paintLine() {
    const dots = dotRefs.current.filter(Boolean) as HTMLSpanElement[];
    const timeline = timelineRef.current;
    if (!timeline || dots.length < 2) { setLine({ top: 0, height: 0, scale: 0 }); return; }
    const first = dots[0].getBoundingClientRect();
    const last = dots[dots.length - 1].getBoundingClientRect();
    const timelineRect = timeline.getBoundingClientRect();
    const top = first.top + first.height / 2 - timelineRect.top;
    const span = (last.top + last.height / 2) - (first.top + first.height / 2);
    setLine({ top: top, height: span, scale: 1 });
  }

  function addNext() {
    setEntries(function (prev) {
      if (prev.length >= LOG.length) return prev;
      const next = LOG[prev.length];
      setLiveNote(next.text + " 기록이 추가됐습니다.");
      return prev.concat([{ time: next.time, text: next.text, state: "in" }]);
    });
  }

  function rewind() {
    setEntries(function (prev) {
      const total = prev.length;
      if (total === 0) return prev;
      prev.forEach(function (_e, i) {
        const reverseIndex = total - 1 - i;
        const delay = reduce ? 0 : reverseIndex * STAGGER_MS * 0.4;
        window.setTimeout(function () {
          setEntries(function (cur) {
            const n = cur.slice();
            if (n[i]) n[i] = { ...n[i], state: "out" };
            return n;
          });
        }, delay);
      });
      window.setTimeout(function () { setEntries([]); }, reduce ? 0 : total * STAGGER_MS * 0.4 + 220);
      setLiveNote(total + "개 기록을 되감았습니다.");
      return prev;
    });
  }

  useEffect(paintLine);

  useEffect(function () {
    addNext();
    if (reduce) return;
    timerRef.current = window.setInterval(function () {
      setEntries(function (prev) {
        if (prev.length >= LOG.length) { rewind(); return prev; }
        addNext();
        return prev;
      });
    }, 420);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + (isDemo ? " " + styles.isDemo : "")}>
        <div className={styles.head}>
          <span className={styles.headTitle}>완료 기록</span>
          <button
            className={styles.rewindBtn}
            type="button"
            aria-label="되감기 — 최근 항목부터 되돌리기"
            onClick={function () { human(); rewind(); }}
          >
            <svg viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
                <path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128" />
              </g>
            </svg>
          </button>
        </div>
        <ol className={styles.timeline} ref={timelineRef}>
          <div className={styles.timelineLine} aria-hidden="true" style={{ top: line.top + "px", height: line.height + "px", transform: "scaleY(" + line.scale + ")" }} />
          {entries.map(function (entry, i) {
            return (
              <li
                key={entry.time + entry.text}
                className={styles.entry + " " + styles[entry.state]}
                style={{ transitionDelay: reduce ? "0ms" : i * STAGGER_MS + "ms" }}
              >
                <span className={styles.dot} aria-hidden="true" ref={function (el: HTMLSpanElement | null) { dotRefs.current[i] = el; }} />
                <span className={styles.entryTime}>{entry.time}</span>
                <span className={styles.entryText}>{entry.text}</span>
              </li>
            );
          })}
        </ol>
        <p className={styles.liveNote} aria-live="polite">{liveNote}</p>
      </div>
    </main>
  );
}
