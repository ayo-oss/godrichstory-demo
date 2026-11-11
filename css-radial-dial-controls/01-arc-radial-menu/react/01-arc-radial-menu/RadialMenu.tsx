// RadialMenu — vanilla 판(run/374/demo/01-arc-radial-menu/index.html) 의 React 포트.
// 계산 겹은 각 항목의 극좌표 배치(각도→x,y)에 있다 — 부채꼴로 펼친 각도를 라디안으로 바꿔 cos/sin 으로 좌표를 구한다.
import { useEffect, useRef, useState } from "react";
import styles from "./RadialMenu.module.scss";

type Box<T> = { current: T };

const ACTIONS = ["복사", "붙여넣기", "삭제", "실행 취소", "다시 실행", "저장"];
const ARC_SPAN_DEG = 200;
const RADIUS = 96;
const LOOP_MS = 2000;

export default function RadialMenu() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const fabRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [status, setStatus] = useState("선택: 없음");
  const [open, setOpenState] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const list = listRef.current;
    const fab = fabRef.current;
    if (!root || !list || !fab) return;

    let isDemo = true;
    let open = false;

    const buttons: HTMLButtonElement[] = Array.prototype.slice.call(list.querySelectorAll("button"));
    const items: HTMLLIElement[] = Array.prototype.slice.call(list.querySelectorAll("li"));
    items.forEach(function (li, i) {
      const angleDeg = -90 - ARC_SPAN_DEG / 2 + i * (ARC_SPAN_DEG / (ACTIONS.length - 1));
      const rad = (angleDeg * Math.PI) / 180;
      const x = Math.round(Math.cos(rad) * RADIUS);
      const y = Math.round(Math.sin(rad) * RADIUS);
      li.style.setProperty("--x", String(x));
      li.style.setProperty("--y", String(y));
      li.style.setProperty("--stagger", String(i));
    });

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function setOpen(next: boolean) {
      open = next;
      root!.classList.toggle(styles.rmOpen, open);
      fab!.setAttribute("aria-expanded", String(open));
      list!.setAttribute("aria-hidden", String(!open));
      buttons.forEach(function (b) { b.tabIndex = open ? 0 : -1; });
      setOpenState(open);
    }

    function onFabClick() { human(); setOpen(!open); }
    fab.addEventListener("click", onFabClick);

    const onItemClicks: Array<() => void> = [];
    buttons.forEach(function (btn, i) {
      const handler = function () {
        human();
        setStatus("선택: " + ACTIONS[i]);
        setOpen(false);
      };
      onItemClicks.push(handler);
      btn.addEventListener("click", handler);
    });

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) { human(); setOpen(false); fab!.focus({ preventScroll: true }); }
    }
    document.addEventListener("keydown", onKeydown);

    function loop(ts: number) {
      if (isDemo && !reduce) {
        const phase = (ts % LOOP_MS) / LOOP_MS;
        const shouldOpen = phase > 0.12 && phase < 0.62;
        if (shouldOpen !== open) { open = shouldOpen; root!.classList.toggle(styles.rmOpen, open); setOpenState(open); }
      } else if (reduce && isDemo) {
        root!.classList.add(styles.rmOpen);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      fab.removeEventListener("click", onFabClick);
      buttons.forEach(function (btn, i) { btn.removeEventListener("click", onItemClicks[i]); });
      document.removeEventListener("keydown", onKeydown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rm + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.field}>
          <ul className={styles.items} ref={listRef} role="menu" aria-hidden="true">
            {ACTIONS.map(function (label) {
              return (
                <li key={label} className={styles.item} role="none">
                  <button className={styles.itemBtn} type="button" role="menuitem" tabIndex={-1}>{label}</button>
                </li>
              );
            })}
          </ul>
          <button className={styles.fab} ref={fabRef} type="button" aria-haspopup="true" aria-expanded={open}>메뉴 열기</button>
        </div>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
