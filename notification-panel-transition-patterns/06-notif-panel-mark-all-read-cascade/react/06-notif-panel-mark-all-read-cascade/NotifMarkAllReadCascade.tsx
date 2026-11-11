// NotifMarkAllReadCascade — vanilla 판(run/405/demo/06-.../index.html) 의 React 포트.
// 계산 겹: 각 항목의 순번(index)에 NOTIF_MARK_ALL_STAGGER_MS 를 곱한 값을 그 항목의
// transitionDelay 로 걸어둔 뒤 한꺼번에 목표 상태를 바꾼다 — 항목 수가 늘면 번지는 시간도
// 그만큼 함께 늘어난다(하드코딩된 총 시간이 아니라 항목 수 x 간격으로 계산한다).
import { useEffect, useRef, useState } from "react";
import styles from "./NotifMarkAllReadCascade.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const NOTIF_MARK_ALL_STAGGER_MS = 70; // 모두 읽음을 눌렀을 때 항목 순번마다 이 값씩 늦게 번진다

const NAMES = [
  "결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요",
  "업로드가 끝났어요", "초대장이 도착했어요",
];

type Row = { li: HTMLLIElement; tint: HTMLElement; fill: HTMLElement; ring: HTMLElement; read: boolean };

export default function NotifMarkAllReadCascade() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const countRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rowsRef = useRef([] as Row[]) as unknown as Box<Row[]>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function updateCount() {
    const unread = rowsRef.current.filter((r) => !r.read).length;
    if (countRef.current) countRef.current.textContent = String(unread);
  }

  function resetAll() {
    rowsRef.current.forEach((r) => {
      r.read = false;
      r.fill.style.transitionDelay = "0ms";
      r.ring.style.transitionDelay = "0ms";
      r.tint.style.transitionDelay = "0ms";
      r.li.style.transitionDelay = "0ms";
      r.fill.style.opacity = "1";
      r.ring.style.borderWidth = "0px";
      r.tint.style.opacity = ".12";
      r.li.style.borderLeftWidth = "3px";
    });
    updateCount();
  }

  // 계산 겹: 각 항목의 순번(index)에 NOTIF_MARK_ALL_STAGGER_MS 를 곱한 값을 그 항목의
  // transitionDelay 로 걸어둔 뒤 한꺼번에 목표 상태를 바꾼다. 같은 지연값을 행 톤(tint)·좌측
  // 굵기(border-left)에도 걸어 점 하나가 아니라 행 전체가 캐스케이드로 보인다.
  function markAllRead() {
    const reduce = reduceRef.current;
    rowsRef.current.forEach((r, i) => {
      if (r.read) return;
      const delay = reduce ? 0 : i * NOTIF_MARK_ALL_STAGGER_MS;
      r.fill.style.transitionDelay = delay + "ms";
      r.ring.style.transitionDelay = delay + "ms";
      r.tint.style.transitionDelay = delay + "ms";
      r.li.style.transitionDelay = delay + "ms";
      r.read = true;
      r.fill.style.opacity = "0";
      r.ring.style.borderWidth = "2.4px";
      r.tint.style.opacity = "0";
      r.li.style.borderLeftWidth = "0px";
    });
    updateCount();
    if (srRef.current) srRef.current.textContent = "모두 읽음으로 표시했습니다";
  }

  function onAllClick() {
    human();
    markAllRead();
  }

  function onAllKeyDown(e: KeyEvt) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      human();
      markAllRead();
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    const list = listRef.current;
    if (!list) return;

    const rows: Row[] = [];
    NAMES.forEach((name) => {
      const li = document.createElement("li");
      li.className = styles.item;
      li.setAttribute("role", "listitem");

      const tint = document.createElement("span");
      tint.className = styles.itemTint;
      tint.setAttribute("aria-hidden", "true");

      const dot = document.createElement("span");
      dot.className = styles.dot;
      const fill = document.createElement("span");
      fill.className = styles.dotFill;
      const ring = document.createElement("span");
      ring.className = styles.dotRing;
      dot.appendChild(fill);
      dot.appendChild(ring);

      const nameEl = document.createElement("span");
      nameEl.className = styles.name;
      nameEl.textContent = name;

      li.appendChild(tint);
      li.appendChild(dot);
      li.appendChild(nameEl);
      list.appendChild(li);
      rows.push({ li, tint, fill, ring, read: false });
    });
    rowsRef.current = rows;
    updateCount();

    if (reduce) {
      markAllRead();
    } else {
      let phase = "mark";
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        if (phase === "mark") {
          markAllRead();
          phase = "reset";
          loopTimerRef.current = window.setTimeout(loop, rowsRef.current.length * NOTIF_MARK_ALL_STAGGER_MS + 550);
        } else {
          resetAll();
          phase = "mark";
          loopTimerRef.current = window.setTimeout(loop, 700);
        }
        synthRef.current = false;
      }
      loopTimerRef.current = window.setTimeout(loop, 350);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ma + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.headLabel}>알림 <span ref={countRef}>5</span></span>
          <button className={styles.all} type="button" onClick={onAllClick} onKeyDown={onAllKeyDown}>
            <svg className={styles.checkIc} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <g fill="currentColor">
                <path opacity=".2" d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" />
                <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
              </g>
            </svg>
            모두 읽음
          </button>
        </div>
        <ul className={styles.list} role="list" ref={listRef} />
        <p className={styles.sr} aria-live="polite" ref={srRef} />
      </div>
    </main>
  );
}
