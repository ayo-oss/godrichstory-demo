// NotifSwipeDismissItem — vanilla 판(run/405/demo/04-.../index.html) 의 React 포트.
// 계산 겹: pointerdown 시각·좌표를 기록해두고 pointermove 로 실제 이동 거리(dx)를,
// pointerup 시점에는 총 이동 시간으로 나눈 속도(px/ms)를 계산한다. 거리 비율(threshold)이나
// 속도 중 하나만 넘어도 지워진다 — 톡 치듯 빠르게 밀면 짧게 밀어도 지워지는 이유. 목록은
// React 가 다시 그리지 않고 imperative 하게 행을 만들고 지운다 — vanilla 와 동일 동작.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifSwipeDismissItem.module.scss";

type Box<T> = { current: T };

const SWIPE_DISMISS_RATIO = 0.32; // 카드 폭 대비 이 비율 이상 밀면 손을 떼도 지워진다
const SWIPE_VELOCITY_PX_MS = 0.6; // 이 속도(px/ms) 이상으로 빠르게 밀면 거리가 짧아도 지워진다

const NAMES = [
  "결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요",
  "업로드가 끝났어요", "초대장이 도착했어요",
];

const XIC =
  '<svg class="' + "__XIC__" + '" viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
  '<g fill="currentColor"><path opacity=".2" d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16"/>' +
  '<path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>';

export default function NotifSwipeDismissItem() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function dismiss(li: HTMLLIElement, name: string) {
    const reduce = reduceRef.current;
    const h = li.getBoundingClientRect().height;
    li.style.height = h + "px";
    li.classList.add(styles.itemOut);
    requestAnimationFrame(() => {
      li.style.height = "0px";
      li.style.marginBottom = "0px";
    });
    window.setTimeout(() => {
      if (li.parentNode) li.parentNode.removeChild(li);
      if (srRef.current) srRef.current.textContent = name + " 알림을 지웠습니다";
    }, reduce ? 0 : 260);
  }

  function makeRow(name: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = styles.item;
    li.setAttribute("role", "listitem");

    const reveal = document.createElement("div");
    reveal.className = styles.reveal;
    reveal.innerHTML = XIC.replace("__XIC__", styles.xic);

    const row = document.createElement("div");
    row.className = styles.row;
    row.textContent = name;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = styles.del;
    delBtn.setAttribute("aria-label", name + " 알림 지우기");
    delBtn.innerHTML = XIC.replace("__XIC__", styles.xic);
    delBtn.addEventListener("click", () => {
      human();
      dismiss(li, name);
    });
    row.appendChild(delBtn);

    li.appendChild(reveal);
    li.appendChild(row);

    let dragging = false, startX = 0, startT = 0, dx = 0, width = 0;

    row.addEventListener("pointerdown", (e: PointerEvent) => {
      human();
      dragging = true;
      startX = e.clientX;
      startT = e.timeStamp;
      dx = 0;
      width = li.getBoundingClientRect().width;
      row.style.transition = "none";
      row.setPointerCapture(e.pointerId);
    });

    row.addEventListener("pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      dx = Math.min(0, e.clientX - startX);
      row.style.transform = "translateX(" + dx + "px)";
      const p = Math.min(1, Math.abs(dx) / width);
      reveal.style.opacity = String(p);
    });

    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      row.style.transition = "";
      const dt = Math.max(1, e.timeStamp - startT);
      const velocity = Math.abs(dx) / dt;
      const ratio = Math.abs(dx) / width;
      if (ratio > SWIPE_DISMISS_RATIO || velocity > SWIPE_VELOCITY_PX_MS) {
        row.style.transform = "translateX(-100%)";
        reveal.style.opacity = "1";
        dismiss(li, name);
      } else {
        row.style.transform = "translateX(0px)";
        reveal.style.opacity = "0";
      }
    }
    row.addEventListener("pointerup", endDrag);
    row.addEventListener("pointercancel", endDrag);

    return li;
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    const list = listRef.current;
    if (!list) return;

    NAMES.forEach((name) => { list.appendChild(makeRow(name)); });

    if (reduce) {
      const last = list.querySelector("li:last-child") as HTMLLIElement | null;
      if (last) dismiss(last, NAMES[NAMES.length - 1]);
    } else {
      function loop() {
        if (!isDemoRef.current || !list) return;
        const first = list.querySelector("li") as HTMLLIElement | null;
        if (!first) {
          NAMES.forEach((name) => { list.appendChild(makeRow(name)); });
          loopTimerRef.current = window.setTimeout(loop, 900);
          return;
        }
        synthRef.current = true;
        const row = first.querySelector("." + styles.row) as HTMLElement | null;
        const revealEl = first.querySelector("." + styles.reveal) as HTMLElement | null;
        const width = first.getBoundingClientRect().width;
        if (row) row.style.transform = "translateX(" + -width * 0.55 + "px)";
        if (revealEl) revealEl.style.opacity = "1";
        window.setTimeout(() => {
          dismiss(first, (first.textContent || "").replace(/알림 지우기$/, "").trim());
          synthRef.current = false;
        }, 380);
        loopTimerRef.current = window.setTimeout(loop, 1100);
      }
      loopTimerRef.current = window.setTimeout(loop, 600);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sw + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <ul className={styles.list} role="list" ref={listRef} />
        <p className={styles.sr} aria-live="polite" ref={srRef} />
      </div>
    </main>
  );
}
