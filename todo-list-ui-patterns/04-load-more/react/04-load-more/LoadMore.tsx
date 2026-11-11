// LoadMore — vanilla 판(run/377/demo/04-load-more/index.html) 의 React 포트.
// 다음 묶음 크기 = BASE_BATCH * LOAD_MORE_MULTIPLIER^클릭수 (고정 3개 나열이 아니다).
import { useEffect, useRef, useState } from "react";
import styles from "./LoadMore.module.scss";

type Box<T> = { current: T };

const BASE_BATCH = 2;
const LOAD_MORE_MULTIPLIER = 2.0;
const STAGGER_MS = 60;

const ALL = [
  "치약 사기", "분리수거 내놓기", "이불 세탁 맡기기", "전구 교체",
  "자동차 세차 예약", "냉장고 정리", "독서 목록 정하기", "운동화 끈 교체",
  "식물 분갈이", "책상 서랍 정리", "영수증 정리", "충전기 케이블 정리",
  "겨울옷 꺼내기", "우산 점검", "건전지 재고 확인", "수건 교체",
  "창문 방충망 청소", "신발장 정리", "노트북 먼지 청소", "메모장 비우기",
];

type Row = { text: string; delayMs: number; entered: boolean };

export default function LoadMore() {
  const [isDemo, setIsDemo] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [clicks, setClicks] = useState(0);
  const [liveNote, setLiveNote] = useState("");
  const timerRef = useRef(0) as unknown as Box<number>;
  const clicksRef = useRef(0) as unknown as Box<number>;
  const shownRef = useRef(0) as unknown as Box<number>;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 계산 겹: 다음 묶음 크기는 고정값이 아니라 클릭 횟수의 지수함수다.
  function nextBatchSize(clickCount: number, shownCount: number) {
    const size = Math.round(BASE_BATCH * Math.pow(LOAD_MORE_MULTIPLIER, clickCount));
    const remain = ALL.length - shownCount;
    return Math.min(size, remain);
  }

  function loadMore() {
    const s = shownRef.current;
    const c = clicksRef.current;
    const n = nextBatchSize(c, s);
    if (n <= 0) return;
    const batch: Row[] = [];
    for (let i = 0; i < n; i++) {
      batch.push({ text: ALL[s + i], delayMs: reduce ? 0 : i * STAGGER_MS, entered: false });
    }
    setRows(function (prev) { return prev.concat(batch); });
    shownRef.current = s + n;
    clicksRef.current = c + 1;
    setClicks(clicksRef.current);
    setLiveNote(n + "개 항목이 추가됐습니다. 총 " + shownRef.current + "개.");
    window.requestAnimationFrame(function () {
      setRows(function (prev) { return prev.map(function (r) { return { ...r, entered: true }; }); });
    });
  }

  function reset() {
    shownRef.current = 0;
    clicksRef.current = 0;
    setClicks(0);
    setRows([]);
  }

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  useEffect(function () {
    loadMore();
    if (reduce) return;
    timerRef.current = window.setInterval(function () {
      if (ALL.length - shownRef.current <= 0) reset();
      loadMore();
    }, 620);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  const remain = ALL.length - shownRef.current;
  const nextSize = nextBatchSize(clicks, shownRef.current);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + (isDemo ? " " + styles.isDemo : "")}>
        <ul className={styles.list}>
          {rows.map(function (r, i) {
            return (
              <li
                key={i}
                className={styles.row + (r.entered ? " " + styles.in : "")}
                style={{ transitionDelay: r.delayMs + "ms" }}
              >
                {r.text}
              </li>
            );
          })}
        </ul>
        <button className={styles.moreBtn} type="button" disabled={remain <= 0} onClick={function () { human(); loadMore(); }}>
          {remain <= 0 ? "모두 봤어요" : nextSize + "개 더 보기"}
        </button>
        <p className={styles.liveNote} aria-live="polite">{liveNote}</p>
      </div>
    </main>
  );
}
