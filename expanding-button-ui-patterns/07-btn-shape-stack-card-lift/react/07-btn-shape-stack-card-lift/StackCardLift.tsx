import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StackCardLift.module.scss";

type Box<T> = { current: T };

const STEP_PX = 34; // 계산 겹: 겹침 카드 하나가 위로 들리는 y 오프셋(px) — 스프링 감쇠로 산출
const STAGGER_MS = 80; // 계산 겹: 뒤 카드부터 이 값씩 늦게 들린다

export default function StackCardLift() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const ghosts = root.querySelectorAll(`.${styles.ghost}`);
    const sub = root.querySelector(`.${styles.sub}`) as HTMLElement | null;
    if (!btn) return;

    ghosts.forEach((g, i) => {
      (g as HTMLElement).style.transitionDelay = ((ghosts.length - 1 - i) * STAGGER_MS) + "ms";
    });

    let open = false;
    function paint() {
      root!.classList.toggle(styles["root--open"], open);
      btn!.setAttribute("aria-expanded", String(open));
      if (sub) sub.textContent = open ? "값 3개 펼침" : "뒤에 값 3개 겹침";
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
    if (!reduce) { autoTimer = window.setInterval(toggle, 1400); }
    else { open = true; paint(); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.sl} ${styles["is-demo"]}`}>
      <div className={styles.pile}>
        <div className={styles.ghost} style={{ "--n": 3 } as CSSProperties} />
        <div className={styles.ghost} style={{ "--n": 2 } as CSSProperties} />
        <div className={styles.ghost} style={{ "--n": 1 } as CSSProperties} />
        <div className={styles.card}>
          <span className={styles.title}>알림 값 묶음</span>
          <span className={styles.sub}>뒤에 값 3개 겹침</span>
        </div>
      </div>
      <button type="button" className={styles.btn} aria-expanded="false">
        <span className={styles.label}>자세히 값 열기</span>
      </button>
    </div>
  );
}
