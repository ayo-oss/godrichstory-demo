// NotifSnoozeSlideOut — vanilla 판(run/405/demo/05-.../index.html) 의 React 포트.
// 계산 겹: 버튼을 누르면 먼저 NOTIF_SNOOZE_SLIDE_PX 만큼만 밀어 "눌렸다"는 반응을 준 뒤,
// 다음 단계에서 li 의 실제 폭(getBoundingClientRect)을 실측해 그 값만큼 마저 밀어 화면
// 밖으로 내보낸다 — 화면 폭이 얼마든 카드가 완전히 빠져나가는 거리를 그때그때 계산한다.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifSnoozeSlideOut.module.scss";

type Box<T> = { current: T };

const NOTIF_SNOOZE_SLIDE_PX = 40; // 버튼을 누른 순간 먼저 밀려나는 예비 이동 거리(그 뒤 실측 폭만큼 마저 나간다)

const DURATIONS = ["10분 뒤", "30분 뒤", "1시간 뒤"];
const NAMES = [
  "결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요",
  "업로드가 끝났어요", "초대장이 도착했어요",
];

const CLOCK_IC =
  '<svg class="' + "__IC__" + '" viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
  '<g fill="currentColor"><path opacity=".2" d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96"/>' +
  '<path d="M232 136.66A104.12 104.12 0 1 1 119.34 24a8 8 0 0 1 1.32 16A88.12 88.12 0 1 0 216 135.34a8 8 0 0 1 16 1.32M120 72v56a8 8 0 0 0 8 8h56a8 8 0 0 0 0-16h-48V72a8 8 0 0 0-16 0m40-24a12 12 0 1 0-12-12a12 12 0 0 0 12 12m36 24a12 12 0 1 0-12-12a12 12 0 0 0 12 12m24 36a12 12 0 1 0-12-12a12 12 0 0 0 12 12"/></g></svg>';

export default function NotifSnoozeSlideOut() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const trayRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
  const snoozedRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function snoozeOut(li: HTMLLIElement, row: HTMLElement, label: HTMLElement, _name: string) {
    const reduce = reduceRef.current;
    const durIdx = snoozedRef.current % DURATIONS.length;
    label.textContent = DURATIONS[durIdx];
    row.style.transform = "translateX(-" + NOTIF_SNOOZE_SLIDE_PX + "px)";
    const width = li.getBoundingClientRect().width;
    window.setTimeout(() => {
      row.style.transform = "translateX(-" + (NOTIF_SNOOZE_SLIDE_PX + width) + "px)";
      const h = li.getBoundingClientRect().height;
      li.style.height = h + "px";
      window.setTimeout(() => {
        li.style.height = "0px";
        li.style.marginBottom = "0px";
      }, reduce ? 0 : 40);
      window.setTimeout(() => {
        if (li.parentNode) li.parentNode.removeChild(li);
      }, reduce ? 0 : 320);
    }, reduce ? 0 : 150);
    snoozedRef.current++;
    if (trayRef.current) trayRef.current.textContent = "스누즈 " + snoozedRef.current + "건 · " + DURATIONS[durIdx];
  }

  function makeRow(name: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = styles.item;
    li.setAttribute("role", "listitem");

    const row = document.createElement("div");
    row.className = styles.row;

    const nameEl = document.createElement("span");
    nameEl.className = styles.name;
    nameEl.textContent = name;

    const label = document.createElement("span");
    label.className = styles.label;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = styles.btn;
    btn.setAttribute("aria-label", name + " 스누즈");
    btn.innerHTML = CLOCK_IC.replace("__IC__", styles.ic);

    row.appendChild(nameEl);
    row.appendChild(label);
    row.appendChild(btn);
    li.appendChild(row);

    btn.addEventListener("click", () => {
      human();
      snoozeOut(li, row, label, name);
    });

    return li;
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    const list = listRef.current;
    if (!list) return;

    NAMES.forEach((name) => { list.appendChild(makeRow(name)); });

    if (reduce) {
      const first = list.querySelector("li") as HTMLLIElement | null;
      if (first) {
        const row0 = first.querySelector("." + styles.row) as HTMLElement;
        const label0 = first.querySelector("." + styles.label) as HTMLElement;
        snoozeOut(first, row0, label0, NAMES[0]);
      }
    } else {
      function loop() {
        if (!isDemoRef.current || !list) return;
        const first = list.querySelector("li") as HTMLLIElement | null;
        if (!first) {
          NAMES.forEach((name) => { list.appendChild(makeRow(name)); });
          snoozedRef.current = 0;
          if (trayRef.current) trayRef.current.textContent = "스누즈 0건";
          loopTimerRef.current = window.setTimeout(loop, 900);
          return;
        }
        synthRef.current = true;
        const row = first.querySelector("." + styles.row) as HTMLElement;
        const label = first.querySelector("." + styles.label) as HTMLElement;
        const nameEl = first.querySelector("." + styles.name) as HTMLElement;
        const name = nameEl ? nameEl.textContent || "" : "";
        snoozeOut(first, row, label, name);
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, 1200);
      }
      loopTimerRef.current = window.setTimeout(loop, 600);
    }

    return () => { window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sn + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.headLabel}>알림</span>
          <span className={styles.tray} ref={trayRef}>스누즈 0건</span>
        </div>
        <ul className={styles.list} role="list" ref={listRef} />
      </div>
    </main>
  );
}
