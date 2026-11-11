import { useEffect, useRef } from "react";
import styles from "./PillToBarSearch.module.scss";

type Box<T> = { current: T };

// 시드 고정 로컬 값 — 실제 검색 API 는 쓰지 않는다
const SEEDS = ["샘플 값 1", "샘플 값 2", "샘플 값 3"];

export default function PillToBarSearch() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const bar = root.querySelector(`.${styles.bar}`) as HTMLElement | null;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const closeBtn = root.querySelector(`.${styles.close}`) as HTMLButtonElement | null;
    if (!bar || !input || !closeBtn) return;

    let open = false;
    function paint() {
      root!.classList.toggle(styles["root--open"], open);
      bar!.setAttribute("aria-expanded", String(open));
      if (open) {
        const w = input!.getBoundingClientRect().width || 1;
        bar!.style.setProperty("--input-w", w + "px");
        input!.focus({ preventScroll: true });
      }
    }
    function toggle() {
      open = !open;
      paint();
    }
    function paintHints() {
      const hints = root!.querySelectorAll("." + styles.hint);
      const q = input!.value.trim();
      const n = q ? Math.min(2, SEEDS.length) : 0;
      hints.forEach((h, i) => {
        h.classList.toggle(styles["hint--on"], i < n);
        if (i < n) (h as HTMLElement).textContent = SEEDS[i];
      });
    }

    function onClose() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      if (open) toggle();
    }
    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paintHints();
    }
    function onFocus() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
    }
    closeBtn.addEventListener("click", onClose);
    input.addEventListener("input", onInput);
    input.addEventListener("focus", onFocus);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let step = 0;
      const TYPES = ["", "샘", ""];
      autoTimer = window.setInterval(() => {
        open = (step % 2 === 0);
        input!.value = TYPES[(step >> 1) % TYPES.length];
        paint();
        paintHints();
        step++;
      }, 1300);
    } else { open = true; input!.value = ""; paint(); }

    return () => {
      stopAutoplay();
      closeBtn.removeEventListener("click", onClose);
      input.removeEventListener("input", onInput);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ps} ${styles["is-demo"]}`}>
      <div className={styles.bar} aria-expanded="false">
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </span>
        <input className={styles.input} type="text" placeholder="찾기 값을 입력" aria-label="찾기 값 입력" />
        <button type="button" className={styles.close} aria-label="찾기 값 닫기">
          <svg viewBox="0 0 24 24" width="14" height="14"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <ul className={styles.hints} aria-hidden="true">
        <li className={styles.hint}>샘플 값 1</li>
        <li className={styles.hint}>샘플 값 2</li>
      </ul>
    </div>
  );
}
