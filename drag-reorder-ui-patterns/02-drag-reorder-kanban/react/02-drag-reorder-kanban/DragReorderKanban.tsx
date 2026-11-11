// DragReorderKanban — vanilla 판(run/336/demo/02-drag-reorder-kanban/index.html)
// 의 React 포트. 포인터가 어느 컬럼의 getBoundingClientRect 안에 있는지로 대상 컬럼을 찾고
// (findColumn), 그 컬럼 안 카드들의 y 중점과 포인터 y 를 비교해 삽입 인덱스를 역산한다
// (insertIndex). 컬럼이 실제로 바뀌는 순간에만 moveCard 가 전체 카드를 FLIP 으로 되돌린다.
import { useEffect, useRef } from "react";
import styles from "./DragReorderKanban.module.scss";

export type DragReorderKanbanProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "포인터 y 를 카드 중점들과 비교해 삽입 인덱스를 역산하고, 컬럼이 바뀌는 순간에만 옮깁니다";
const NAMES = ["할 일", "하는 중"];

type CardDef = { tag: string; tagClass: string; txt: string };
const CARDS_A: CardDef[] = [
  { tag: "설계", tagClass: "b", txt: "리스트 구조 잡기" },
  { tag: "설계", tagClass: "b", txt: "토큰 정리" },
  { tag: "작업", tagClass: "m", txt: "드래그 붙이기" }
];
const CARDS_B: CardDef[] = [
  { tag: "작업", tagClass: "m", txt: "인덱스 계산" },
  { tag: "검토", tagClass: "o", txt: "측정값 확인" }
];

export default function DragReorderKanban({
  duration = "260ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: DragReorderKanbanProps) {
  const colARef = useRef<HTMLElement | null>(null);
  const colBRef = useRef<HTMLElement | null>(null);
  const listARef = useRef<HTMLUListElement | null>(null);
  const listBRef = useRef<HTMLUListElement | null>(null);
  const countARef = useRef<HTMLElement | null>(null);
  const countBRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);
  const colTxtRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const colA = colARef.current;
    const colB = colBRef.current;
    const listA = listARef.current;
    const listB = listBRef.current;
    const countA = countARef.current;
    const countB = countBRef.current;
    const stateEl = stateRef.current;
    const colEl = colTxtRef.current;
    if (!colA || !colB || !listA || !listB || !countA || !countB || !stateEl || !colEl) return;

    const COLS = [colA, colB];
    const lineClass = styles.line;
    const cardClass = styles.card;
    const dragClass = styles.cardDrag;

    function findColumn(x: number): number {
      for (let i = 0; i < COLS.length; i++) {
        const r = COLS[i]!.getBoundingClientRect();
        if (x >= r.left && x <= r.right) return i;
      }
      return -1;
    }

    function insertIndex(colList: HTMLElement, y: number): number {
      const cards = colList.children;
      for (let i = 0; i < cards.length; i++) {
        const r = (cards[i] as HTMLElement).getBoundingClientRect();
        if (y < r.top + r.height / 2) return i;
      }
      return cards.length;
    }

    function refreshCounts(): void {
      countA!.textContent = String(listA!.children.length);
      countB!.textContent = String(listB!.children.length);
    }

    function allCards(): HTMLElement[] {
      return Array.prototype.slice.call(document.querySelectorAll("." + cardClass));
    }

    function moveCard(card: HTMLElement, toList: HTMLElement, index: number): void {
      const all = allCards();
      const first = all.map((c) => c.getBoundingClientRect());
      const target = (toList.children[index] as HTMLElement) || null;
      toList.insertBefore(card, target);
      refreshCounts();
      all.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const dx = first[i].left - r.left;
        const dy = first[i].top - r.top;
        if (dx !== 0 || dy !== 0) {
          c.style.transition = "none";
          c.style.transform = "translate(" + dx + "px," + dy + "px)";
          requestAnimationFrame(() => {
            c.style.transition = "transform " + duration + " " + easing;
            c.style.transform = "translate(0,0)";
          });
        }
      });
    }

    function previewLine(card: HTMLElement, y: number): void {
      const list = card.parentElement;
      if (!list) return;
      const idx = insertIndex(list as HTMLElement, y);
      stateEl!.textContent = "insert " + idx;
      colEl!.textContent = (list === listA ? NAMES[0] : NAMES[1]) + " 컬럼";
      const old = list.querySelector("." + lineClass);
      if (old && old.parentElement) old.parentElement.removeChild(old);
      const line = document.createElement("li");
      line.className = lineClass;
      const target = (list.children[idx] as HTMLElement) || null;
      list.insertBefore(line, target);
    }

    function clearLines(): void {
      document.querySelectorAll("." + lineClass).forEach((l) => {
        if (l.parentElement) l.parentElement.removeChild(l);
      });
    }

    let dragCard: HTMLElement | null = null;

    function onPointerDown(e: PointerEvent): void {
      const card = (e.target as HTMLElement).closest("." + cardClass) as HTMLElement | null;
      if (!card) return;
      stop();
      dragCard = card;
      card.setPointerCapture(e.pointerId);
      card.classList.add(dragClass);
    }
    function onPointerMove(e: PointerEvent): void {
      if (!dragCard) return;
      const ci = findColumn(e.clientX);
      const list = ci === 1 ? listB! : listA!;
      previewLine(dragCard, e.clientY);
      if (list !== dragCard.parentElement) {
        const idx = insertIndex(list, e.clientY);
        const target = (list.children[idx] as HTMLElement) || null;
        list.insertBefore(dragCard, target);
        refreshCounts();
      }
    }
    function onPointerUp(e: PointerEvent): void {
      if (!dragCard) return;
      const card = dragCard;
      dragCard = null;
      card.classList.remove(dragClass);
      const list = card.parentElement as HTMLElement;
      const idx = insertIndex(list, e.clientY);
      moveCard(card, list, Math.min(idx, list.children.length - 1));
      clearLines();
    }
    function onCardClick(e: MouseEvent): void {
      if (dragCard) return;
      stop();
      const card = (e.target as HTMLElement).closest("." + cardClass) as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const toOther = card.parentElement === listA ? listB! : listA!;
      const idx = insertIndex(toOther, r.top + r.height / 2);
      moveCard(card, toOther, idx);
    }

    colA.addEventListener("pointerdown", onPointerDown as EventListener);
    colB.addEventListener("pointerdown", onPointerDown as EventListener);
    colA.addEventListener("pointermove", onPointerMove as EventListener);
    colB.addEventListener("pointermove", onPointerMove as EventListener);
    colA.addEventListener("pointerup", onPointerUp as EventListener);
    colB.addEventListener("pointerup", onPointerUp as EventListener);
    colA.addEventListener("pointercancel", onPointerUp as EventListener);
    colB.addEventListener("pointercancel", onPointerUp as EventListener);
    colA.addEventListener("click", onCardClick as EventListener);
    colB.addEventListener("click", onCardClick as EventListener);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function step1(): void {
      const card = listA!.children[1] as HTMLElement;
      if (!card) return;
      const rb = colB!.getBoundingClientRect();
      const y = rb.top + rb.height / 2;
      previewLine(card, y);
      const idx = insertIndex(listB!, y);
      moveCard(card, listB!, idx);
    }
    function step2(): void {
      const card = listB!.children[0] as HTMLElement;
      if (!card) return;
      const ra = colA!.getBoundingClientRect();
      const y = ra.top + ra.height / 2;
      previewLine(card, y);
      const idx = insertIndex(listA!, y);
      moveCard(card, listA!, idx);
    }

    let rafId = 0;
    if (reduce) {
      step1();
      clearLines();
    } else {
      const seq = [
        { at: 0, fn: step1, done: false },
        { at: 660, fn: clearLines, done: false },
        { at: 1000, fn: step2, done: false },
        { at: 1660, fn: clearLines, done: false }
      ];
      const loopStart = performance.now();
      const tick = (now: number): void => {
        const t = (now - loopStart) % 2000;
        seq.forEach((s) => {
          if (playing && t >= s.at && t < s.at + 90 && !s.done) {
            s.fn();
            s.done = true;
          }
          if (t < s.at) s.done = false;
        });
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      colA.removeEventListener("pointerdown", onPointerDown as EventListener);
      colB.removeEventListener("pointerdown", onPointerDown as EventListener);
      colA.removeEventListener("pointermove", onPointerMove as EventListener);
      colB.removeEventListener("pointermove", onPointerMove as EventListener);
      colA.removeEventListener("pointerup", onPointerUp as EventListener);
      colB.removeEventListener("pointerup", onPointerUp as EventListener);
      colA.removeEventListener("pointercancel", onPointerUp as EventListener);
      colB.removeEventListener("pointercancel", onPointerUp as EventListener);
      colA.removeEventListener("click", onCardClick as EventListener);
      colB.removeEventListener("click", onCardClick as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.kb}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.board}>
          <section className={styles.col} ref={colARef} aria-label={NAMES[0]}>
            <h2 className={styles.title}>{NAMES[0]} <b className={styles.count} ref={countARef}>{CARDS_A.length}</b></h2>
            <ul className={styles.cards} ref={listARef}>
              {CARDS_A.map((c, i) => (
                <li key={i} className={styles.card}>
                  <span className={styles.tag + " " + (styles as Record<string, string>)["tag" + c.tagClass.toUpperCase()]}>{c.tag}</span>
                  <span className={styles.txt}>{c.txt}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.col} ref={colBRef} aria-label={NAMES[1]}>
            <h2 className={styles.title}>{NAMES[1]} <b className={styles.count} ref={countBRef}>{CARDS_B.length}</b></h2>
            <ul className={styles.cards} ref={listBRef}>
              {CARDS_B.map((c, i) => (
                <li key={i} className={styles.card}>
                  <span className={styles.tag + " " + (styles as Record<string, string>)["tag" + c.tagClass.toUpperCase()]}>{c.tag}</span>
                  <span className={styles.txt}>{c.txt}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>insert 2</b>
          <span className={styles.unit} ref={colTxtRef}>{NAMES[0]} 컬럼</span>
        </p>
      </div>
    </main>
  );
}
