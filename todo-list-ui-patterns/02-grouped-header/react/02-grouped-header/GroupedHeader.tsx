// GroupedHeader — vanilla 판(run/377/demo/02-grouped-header/index.html) 의 React 포트.
// 스크롤 위치로 현재 그룹을 찾고 그 그룹의 미완료 개수를 매 스크롤 프레임마다 다시 센다.
import { useEffect, useRef, useState } from "react";
import styles from "./GroupedHeader.module.scss";

type Box<T> = { current: T };

type Item = { text: string; done: boolean };
type Group = { name: string; items: Item[] };

const GROUPS: Group[] = [
  { name: "오늘", items: [{ text: "치과 예약 확인", done: false }, { text: "보고서 초안 제출", done: false }, { text: "우유 사기", done: true }] },
  { name: "이번주", items: [{ text: "세금 신고 서류 준비", done: false }, { text: "헬스장 등록 연장", done: false }, { text: "책 반납", done: false }, { text: "화분 물 주기", done: true }] },
  { name: "나중", items: [{ text: "여행 계획 세우기", done: false }, { text: "책상 정리", done: false }] },
];

export default function GroupedHeader() {
  const scrollerRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const groupRefs = useRef([]) as unknown as Box<(HTMLLIElement | null)[]>;
  const [isDemo, setIsDemo] = useState(true);
  const [head, setHead] = useState({ name: GROUPS[0].name, remain: GROUPS[0].items.filter(function (i) { return !i.done; }).length });
  const timerRef = useRef(0) as unknown as Box<number>;

  function paint() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = scroller.scrollTop;
    let idx = 0;
    for (let i = 0; i < groupRefs.current.length; i++) {
      const el = groupRefs.current[i];
      if (el && el.offsetTop - scroller.offsetTop <= top + 4) idx = i;
    }
    const remain = GROUPS[idx].items.filter(function (it) { return !it.done; }).length;
    setHead({ name: GROUPS[idx].name, remain: remain });
  }

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  useEffect(function () {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scroller = scrollerRef.current;
    if (!scroller || reduce) return;
    let dir = 1;
    function autoAdvance() {
      const max = scroller!.scrollHeight - scroller!.clientHeight;
      let next = scroller!.scrollTop + dir * (max * 0.34);
      if (next >= max - 1) { next = max; dir = -1; }
      else if (next <= 1) { next = 0; dir = 1; }
      scroller!.scrollTop = next;
      paint();
    }
    // vanilla 와 동일 — 첫 전환을 즉시 내고 간격을 좁혀 측정 창 안에서 안정적으로 여러 번 전환한다
    autoAdvance();
    timerRef.current = window.setInterval(autoAdvance, 350);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + (isDemo ? " " + styles.isDemo : "")}>
        <div className={styles.head}>
          <span className={styles.headLabel}>{head.name}</span>
          <span className={styles.headCount}>{head.remain}건 남음</span>
        </div>
        <div
          className={styles.scroller}
          ref={scrollerRef}
          onScroll={paint}
          onPointerDown={human}
          onKeyDown={human}
          onWheel={human}
        >
          <ul className={styles.list}>
            {GROUPS.map(function (g, i) {
              return (
                <li className={styles.group} key={g.name} ref={function (el: HTMLLIElement | null) { groupRefs.current[i] = el; }}>
                  <p className={styles.groupTitle}>{g.name}</p>
                  <ul className={styles.items}>
                    {g.items.map(function (it) {
                      return <li key={it.text} data-done={it.done ? "1" : "0"}>{it.text}</li>;
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
