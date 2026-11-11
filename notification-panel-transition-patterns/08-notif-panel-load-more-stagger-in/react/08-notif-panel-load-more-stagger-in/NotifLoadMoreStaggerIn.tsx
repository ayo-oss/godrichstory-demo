// NotifLoadMoreStaggerIn — vanilla 판(run/405/demo/08-.../index.html) 의 React 포트.
// 계산 겹: 새로 불러오는 배치 안에서 항목의 순번(order)에 NOTIF_LOAD_STAGGER_MS 를 곱해
// transitionDelay 로 건다 — 한 번에 부르는 항목 수가 몇 개든 그 수만큼 자연스럽게 늦게까지
// 이어서 떠오른다(고정된 총 시간이 아니라 항목 수 x 간격으로 계산). 강제 리플로우 뒤 이중
// requestAnimationFrame 으로 최종 값을 걸어야 시작 프레임이 실제로 그려진다(실측 2026-09-24).
import { useEffect, useRef, useState } from "react";
import styles from "./NotifLoadMoreStaggerIn.module.scss";

type Box<T> = { current: T };

const NOTIF_LOAD_STAGGER_MS = 60; // 새로 불러온 항목이 순번마다 이 값씩 늦게 떠오른다

const PAGES = [
  ["결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요"],
  ["업로드가 끝났어요", "초대장이 도착했어요", "일정이 변경됐어요"],
  ["팔로워가 늘었어요", "보고서가 반려됐어요"],
];

export default function NotifLoadMoreStaggerIn() {
  const [isDemo, setIsDemo] = useState(true);
  const [moreDisabled, setMoreDisabled] = useState(false);
  const [moreLabel, setMoreLabel] = useState("더 보기");

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
  const pageIdxRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function makeRow(name: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = styles.item;
    li.setAttribute("role", "listitem");
    li.textContent = name;
    return li;
  }

  function loadMore() {
    const list = listRef.current;
    if (!list || pageIdxRef.current >= PAGES.length) return;
    const reduce = reduceRef.current;
    const names = PAGES[pageIdxRef.current];
    pageIdxRef.current++;
    const added: { li: HTMLLIElement; order: number }[] = [];
    names.forEach((name, order) => {
      const li = makeRow(name);
      li.style.opacity = "0";
      li.style.transform = "translateY(14px)";
      list.appendChild(li);
      added.push({ li, order });
    });
    void list.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        added.forEach((a) => {
          const delay = reduce ? 0 : a.order * NOTIF_LOAD_STAGGER_MS;
          a.li.style.transitionDelay = delay + "ms";
          a.li.style.opacity = "1";
          a.li.style.transform = "translateY(0)";
        });
      });
    });
    if (srRef.current) srRef.current.textContent = names.length + "개 알림을 더 불러왔습니다";
    if (pageIdxRef.current >= PAGES.length) {
      setMoreDisabled(true);
      setMoreLabel("더 볼 알림 없음");
    }
  }

  // 첫 화면은 애니메이션 없이 조용히 채운다 — 페이지가 열리자마자 전환이 걸려 있으면
  // 측정 도구가 "이미 진행 중인 애니메이션"으로 오판해 그 뒤 실제 클릭·자동 시연에서
  // 일어나는 움직임을 못 잡는다. 눈에 보이는 전환은 항상 그 다음부터.
  function fillStatic() {
    const list = listRef.current;
    if (!list) return;
    list.innerHTML = "";
    pageIdxRef.current = 1;
    PAGES[0].forEach((name) => { list.appendChild(makeRow(name)); });
    setMoreDisabled(false);
    setMoreLabel("더 보기");
  }

  function reset() {
    const list = listRef.current;
    if (!list) return;
    list.innerHTML = "";
    pageIdxRef.current = 0;
    setMoreDisabled(false);
    setMoreLabel("더 보기");
    loadMore();
  }

  function onMoreClick() {
    human();
    loadMore();
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    fillStatic();

    if (reduce) {
      while (pageIdxRef.current < PAGES.length) loadMore();
    } else {
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        if (pageIdxRef.current < PAGES.length) loadMore();
        else reset();
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, 900);
      }
      loopTimerRef.current = window.setTimeout(loop, 250);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lm + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <ul className={styles.list} role="list" ref={listRef} />
        <button className={styles.more} type="button" disabled={moreDisabled} onClick={onMoreClick}>{moreLabel}</button>
        <p className={styles.sr} aria-live="polite" ref={srRef} />
      </div>
    </main>
  );
}
