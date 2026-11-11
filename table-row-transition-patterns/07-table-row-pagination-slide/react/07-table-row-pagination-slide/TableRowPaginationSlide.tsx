import { useEffect, useRef } from "react";
import styles from "./TableRowPaginationSlide.module.scss";

type Box<T> = { current: T };

type LiveRow = { el: HTMLDivElement; x: number; targetX: number; delayUntil: number; role: "stay" | "out" | "in" };

export default function TableRowPaginationSlide() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const labelRef = useRef(null) as unknown as Box<HTMLSpanElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const pageLabel = labelRef.current;
    if (!root || !viewport || !pageLabel) return;

    // 상수: 컨테이너 폭(px) · 행 높이(px) · stagger 간격(ms) · 보간 속도 · 자동 전환 간격
    const W = 240;
    const ROW_H = 30;
    const STAGGER_MS = 60;
    const LERP = 0.28;
    const AUTO_PAGE_MS = 1600;

    const pages: [string, number][][] = [
      [["사과", 120], ["바나나", 80], ["포도", 45], ["체리", 12]],
      [["배", 33], ["자두", 21], ["수박", 5], ["참외", 18]],
      [["키위", 60], ["망고", 40], ["딸기", 90], ["블루베리", 27]],
    ];

    let pageIndex = 0;
    let live: LiveRow[] = [];
    let transitioning = false;
    let stopped = false;
    let rafId = 0;
    const timers: number[] = [];

    function makeRow(item: [string, number]) {
      const el = document.createElement("div");
      el.className = styles.row;
      el.innerHTML = `<span class="${styles.cell}">${item[0]}</span><span class="${styles.cell} ${styles.cellNum}">${item[1]}</span>`;
      viewport!.appendChild(el);
      return el;
    }

    function renderInitial() {
      pages[pageIndex].forEach((item) => {
        const el = makeRow(item);
        live.push({ el, x: 0, targetX: 0, delayUntil: 0, role: "stay" });
      });
      layoutStay();
      pageLabel!.textContent = (pageIndex + 1) + " / " + pages.length;
    }

    function layoutStay() {
      let i = 0;
      live.forEach((r) => {
        r.el.style.top = (i * ROW_H) + "px";
        i++;
      });
    }

    // 계산 겹: 페이지 값이 바뀌면 방향 값(dir)에 따라 나가는 행·들어오는 행에 행 순서 × STAGGER_MS 만큼
    // 시작 시각을 다르게 걸어(stagger) 목표 x 로 보간한다
    function goTo(newIndex: number) {
      if (transitioning || newIndex < 0 || newIndex >= pages.length || newIndex === pageIndex) return;
      transitioning = true;
      const dir = newIndex > pageIndex ? 1 : -1;
      const now = performance.now();
      const outgoing = live.slice();
      outgoing.forEach((r, i) => {
        r.role = "out";
        r.targetX = -dir * W;
        r.delayUntil = now + i * STAGGER_MS;
      });
      const incoming: LiveRow[] = pages[newIndex].map((item, i) => {
        const el = makeRow(item);
        el.style.top = (i * ROW_H) + "px";
        el.style.transform = "translateX(" + (dir * W) + "px)";
        return { el, x: dir * W, targetX: 0, delayUntil: now + i * STAGGER_MS, role: "in" };
      });
      live = outgoing.concat(incoming);
      pageIndex = newIndex;
      pageLabel!.textContent = (pageIndex + 1) + " / " + pages.length;

      const tid = window.setTimeout(() => {
        outgoing.forEach((r) => r.el.remove());
        live = live.filter((r) => r.role !== "out");
        live.forEach((r) => { r.role = "stay"; });
        transitioning = false;
      }, 900);
      timers.push(tid);
    }

    function tick() {
      if (stopped) return;
      const now = performance.now();
      live.forEach((r) => {
        if (now < r.delayUntil) return;
        r.x += (r.targetX - r.x) * LERP;
        r.el.style.transform = "translateX(" + r.x.toFixed(1) + "px)";
        r.el.style.opacity = String(Math.max(0, 1 - Math.abs(r.x) / W));
      });
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    renderInitial();
    viewport.style.height = (4 * ROW_H) + "px";

    const prevBtn = root.querySelector(`.${styles.btn}[data-dir="prev"]`) as HTMLButtonElement;
    const nextBtn = root.querySelector(`.${styles.btn}[data-dir="next"]`) as HTMLButtonElement;
    function onPrev() {
      viewport!.classList.remove(styles["is-demo"]);
      goTo(pageIndex - 1);
    }
    function onNext() {
      viewport!.classList.remove(styles["is-demo"]);
      goTo(pageIndex + 1);
    }
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);

    function autoStep() {
      if (stopped) return;
      if (viewport!.classList.contains(styles["is-demo"])) {
        goTo((pageIndex + 1) % pages.length);
      }
      const tid = window.setTimeout(autoStep, AUTO_PAGE_MS);
      timers.push(tid);
    }
    const firstTid = window.setTimeout(autoStep, AUTO_PAGE_MS);
    timers.push(firstTid);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      timers.forEach((t) => window.clearTimeout(t));
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      live.forEach((r) => r.el.remove());
    };
  }, []);

  return (
    <div className={styles.stage}>
      <div ref={rootRef} className={styles.tps}>
        <div ref={viewportRef} className={`${styles.viewport} ${styles["is-demo"]}`} />
        <div className={styles.nav}>
          <button className={styles.btn} data-dir="prev" type="button" aria-label="이전 페이지">‹</button>
          <span ref={labelRef} className={styles.page}>1 / 3</span>
          <button className={styles.btn} data-dir="next" type="button" aria-label="다음 페이지">›</button>
        </div>
      </div>
    </div>
  );
}
