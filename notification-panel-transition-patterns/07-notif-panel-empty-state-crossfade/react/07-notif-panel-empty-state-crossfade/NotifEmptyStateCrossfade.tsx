// NotifEmptyStateCrossfade — vanilla 판(run/405/demo/07-.../index.html) 의 React 포트.
// 계산 겹: 목록 → 빈 상태 전환은 투명도만 바꾸지 않는다. 목록은 살짝 위로 이동하며 사라지고
// 빈 상태 그림은 아래에서 올라오며 나타나도록 opacity 와 transform(translateY)을 함께 바꿔,
// 정지 사진 한 장만으로는 두 상태가 섞인 유령 프레임처럼 보이지 않게 한다 — vanilla 와 동일.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifEmptyStateCrossfade.module.scss";

type Box<T> = { current: T };

const NAMES = ["결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요", "업로드가 끝났어요"];

export default function NotifEmptyStateCrossfade() {
  const [isDemo, setIsDemo] = useState(true);
  const [clearDisabled, setClearDisabled] = useState(false);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const emptyRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
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

  function fill() {
    const list = listRef.current;
    if (!list) return;
    list.innerHTML = "";
    NAMES.forEach((name) => { list.appendChild(makeRow(name)); });
  }

  function showEmpty() {
    const reduce = reduceRef.current;
    const list = listRef.current, empty = emptyRef.current;
    if (!list || !empty) return;
    empty.removeAttribute("hidden");
    requestAnimationFrame(() => {
      list.classList.add(styles.listOut);
      empty.classList.add(styles.emptyIn);
    });
    window.setTimeout(() => { list.setAttribute("hidden", ""); }, reduce ? 0 : 260);
    setClearDisabled(true);
    if (srRef.current) srRef.current.textContent = "받은 알림이 없어요";
  }

  function showList() {
    const reduce = reduceRef.current;
    const list = listRef.current, empty = emptyRef.current;
    if (!list || !empty) return;
    fill();
    list.removeAttribute("hidden");
    requestAnimationFrame(() => {
      list.classList.remove(styles.listOut);
      empty.classList.remove(styles.emptyIn);
    });
    window.setTimeout(() => { empty.setAttribute("hidden", ""); }, reduce ? 0 : 260);
    setClearDisabled(false);
    if (srRef.current) srRef.current.textContent = NAMES.length + "개 알림을 받았습니다";
  }

  function onClear() {
    human();
    if (clearDisabled) return;
    showEmpty();
  }

  function onRefill() {
    human();
    showList();
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    fill();

    if (reduce) {
      showEmpty();
    } else {
      let phase = "clear";
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        if (phase === "clear") { showEmpty(); phase = "fill"; } else { showList(); phase = "clear"; }
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, 1600);
      }
      loopTimerRef.current = window.setTimeout(loop, 700);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.es + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.headLabel}>알림</span>
          <button className={styles.clear} type="button" disabled={clearDisabled} onClick={onClear}>모두 지우기</button>
        </div>
        <div className={styles.body}>
          <ul className={styles.list} role="list" ref={listRef} />
          <div className={styles.empty} ref={emptyRef} hidden>
            <svg className={styles.trayIc} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path opacity=".2" d="M216 48v112h-36.69a8 8 0 0 0-5.66 2.34l-19.31 19.32a8 8 0 0 1-5.66 2.34h-41.37a8 8 0 0 1-5.66-2.34l-19.31-19.32a8 8 0 0 0-5.66-2.34H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" />
                <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 16v104h-28.7a15.86 15.86 0 0 0-11.3 4.69L148.69 176h-41.38L88 156.68A15.9 15.9 0 0 0 76.69 152H48V48Zm0 160H48v-40h28.69L96 187.32a15.9 15.9 0 0 0 11.31 4.68h41.38a15.86 15.86 0 0 0 11.31-4.69L179.31 168H208z" />
              </g>
            </svg>
            <p className={styles.emptyText}>받은 알림이 없어요</p>
            <button className={styles.refill} type="button" onClick={onRefill}>새 알림 받기</button>
          </div>
        </div>
        <p className={styles.sr} aria-live="polite" ref={srRef} />
      </div>
    </main>
  );
}
