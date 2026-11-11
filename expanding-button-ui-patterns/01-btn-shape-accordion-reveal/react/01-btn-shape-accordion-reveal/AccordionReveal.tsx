import { useEffect, useRef } from "react";
import styles from "./AccordionReveal.module.scss";

type Box<T> = { current: T };

const STAGGER_MS = 70; // 계산 겹: 항목 순서 * 이 값만큼 늦게 나타난다

export default function AccordionReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const panel = root.querySelector(`.${styles.panel}`) as HTMLElement | null;
    const items = root.querySelectorAll(`.${styles.item}`);
    if (!btn || !panel) return;

    items.forEach((li, i) => {
      (li as HTMLElement).style.transitionDelay = (i * STAGGER_MS) + "ms";
    });

    function measure() {
      let h = 0;
      items.forEach((li) => { h += li.getBoundingClientRect().height; });
      panel!.style.setProperty("--panel-h", h + "px");
    }

    let open = false;
    function paint() {
      measure();
      root!.classList.toggle(styles["root--open"], open);
      btn!.setAttribute("aria-expanded", String(open));
    }
    function toggle() {
      open = !open;
      paint();
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    btn.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    measure();
    if (!reduce) { toggle(); autoTimer = window.setInterval(toggle, 800); }
    else { open = true; paint(); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ba} ${styles["is-demo"]}`}>
      <button type="button" className={styles.btn} aria-expanded="false">
        <span className={styles.label}>열림 값 펼치기</span>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      <div className={styles.panel} role="region">
        <ul className={styles.list}>
          <li className={styles.item}>답변 값 1</li>
          <li className={styles.item}>답변 값 2</li>
          <li className={styles.item}>답변 값 3</li>
        </ul>
      </div>
    </div>
  );
}
