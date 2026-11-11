import { useEffect, useRef } from "react";
import styles from "./CommentThreadSortReorderFlip.module.scss";

// 기법: FLIP(First-Last-Invert-Play). 정렬 기준을 바꾸기 전 각 항목의 rect 를 기록(First)하고
// DOM 순서를 새 정렬로 바로 바꾼 뒤(Last) 다시 rect 를 재서 차이(Invert)를 transform 으로
// 되돌렸다가 0 으로 애니메이션(Play)한다.
const SORT_FLIP_DURATION_MS = 320;

const NEWEST_ORDER = ["c1", "c2", "c3", "c4", "c5"];
const LIKES: Record<string, number> = { c1: 12, c2: 41, c3: 7, c4: 25, c5: 3 };

export default function CommentThreadSortReorderFlip() {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const sortLabelRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    const root = rootRef.current;
    const list = listRef.current;
    const sortBtn = sortBtnRef.current;
    const sortLabel = sortLabelRef.current;
    const status = statusRef.current;
    if (!root || !list || !sortBtn || !sortLabel || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let popular = false;

    function sortedIds(): string[] {
      if (!popular) return NEWEST_ORDER.slice();
      return NEWEST_ORDER.slice().sort((a, b) => LIKES[b] - LIKES[a]);
    }

    function applySort(animate: boolean, delayMs: number) {
      const refs = itemRefs.current!;
      const ids = NEWEST_ORDER;
      const before: Record<string, DOMRect> = {};
      for (const id of ids) {
        const el = refs[id];
        if (el) before[id] = el.getBoundingClientRect();
      }

      const order = sortedIds();
      for (const id of order) {
        const el = refs[id];
        if (el) list!.appendChild(el);
      }

      if (!animate || reduce) return;

      order.forEach((id, m) => {
        const el = refs[id];
        if (!el) return;
        const after = el.getBoundingClientRect();
        const b = before[id];
        const dy = b.top - after.top;
        if (Math.abs(dy) < 0.5) return;
        const sideX = (m % 2 === 0 ? 1 : -1) * Math.min(14, Math.abs(dy) * 0.12);
        el.style.zIndex = String(10 - m);
        el.animate(
          [
            { transform: `translate(0px,${dy}px)` },
            { transform: `translate(${sideX}px,${dy * 0.4}px)` },
            { transform: "translate(0px,0px)" },
          ],
          { duration: SORT_FLIP_DURATION_MS, delay: delayMs, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }
        );
      });
    }

    function setPopular(next: boolean, animate: boolean, delayMs: number) {
      popular = next;
      sortBtn!.setAttribute("aria-pressed", String(popular));
      sortLabel!.textContent = popular ? "인기순" : "최신순";
      status!.textContent = popular ? "좋아요 많은 순으로 정렬했습니다." : "최신 순으로 정렬했습니다.";
      applySort(animate, delayMs);
    }

    const onActivate = () => { root.classList.remove("is-demo"); setPopular(!popular, true, 0); };
    sortBtn.addEventListener("click", onActivate);
    sortBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    });

    let seqTimer: number | undefined;
    function playSequence() {
      if (seqTimer) { window.clearTimeout(seqTimer); seqTimer = undefined; }
      setPopular(false, false, 0);
      setPopular(true, true, 240);
      seqTimer = window.setTimeout(() => { setPopular(false, true, 0); }, 1080);
    }

    let timer: number | undefined;
    if (reduce) {
      setPopular(false, false, 0);
    } else {
      playSequence();
      timer = window.setInterval(() => {
        if (!root.classList.contains("is-demo")) return;
        setPopular(!popular, true, 0);
      }, 2400);
    }

    return () => { if (timer) window.clearInterval(timer); if (seqTimer) window.clearTimeout(seqTimer); };
  }, []);

  const comments = [
    { id: "c1", name: "하늘연필", time: "방금", text: "정리 잘 되어있네요.", likes: 12 },
    { id: "c2", name: "노을풍경", time: "3분 전", text: "코드 그대로 써도 되나요?", likes: 41 },
    { id: "c3", name: "초록달빛", time: "9분 전", text: "감사합니다, 큰 도움 됐어요.", likes: 7 },
    { id: "c4", name: "바람소리", time: "22분 전", text: "다음 편도 기대할게요.", likes: 25 },
    { id: "c5", name: "모래시계", time: "41분 전", text: "이 부분 설명 최고예요.", likes: 3 },
  ];

  return (
    <main className={styles.stage}>
      <div className={`${styles.srt} is-demo`} ref={rootRef}>
        <div className={styles.srt__head}>
          <button type="button" className={styles.srt__sortBtn} ref={sortBtnRef} aria-pressed="false">
            <svg className={styles.srt__sortIcon} viewBox="0 0 256 256" aria-hidden="true">
              <g fill="currentColor">
                <path d="M176 48v160H80V48Z" opacity=".2" />
                <path d="M117.66 170.34a8 8 0 0 1 0 11.32l-32 32a8 8 0 0 1-11.32 0l-32-32a8 8 0 0 1 11.32-11.32L72 188.69V48a8 8 0 0 1 16 0v140.69l18.34-18.35a8 8 0 0 1 11.32 0m96-96l-32-32a8 8 0 0 0-11.32 0l-32 32a8 8 0 0 0 11.32 11.32L168 67.31V208a8 8 0 0 0 16 0V67.31l18.34 18.35a8 8 0 0 0 11.32-11.32" />
              </g>
            </svg>
            <span className={styles.srt__sortLabel} ref={sortLabelRef}>최신순</span>
          </button>
        </div>
        <ul className={styles.srt__list} role="list" ref={listRef}>
          {comments.map((c) => (
            <li
              key={c.id}
              className={styles.srt__item}
              data-id={c.id}
              data-likes={c.likes}
              ref={(el: HTMLLIElement | null) => { itemRefs.current![c.id] = el; }}
            >
              <span className={styles.srt__avatar} aria-hidden="true" />
              <div className={styles.srt__body}>
                <p className={styles.srt__meta}>
                  <strong className={styles.srt__name}>{c.name}</strong>
                  <span className={styles.srt__time}>{c.time}</span>
                </p>
                <p className={styles.srt__text}>{c.text}</p>
              </div>
              <span className={styles.srt__likes}>♥ {c.likes}</span>
            </li>
          ))}
        </ul>
        <p className={styles.srt__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
