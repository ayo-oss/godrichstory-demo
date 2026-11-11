import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerSlideSpringOvershoot.module.scss";

export type CartDrawerSlideSpringOvershootProps = {
  /** 스프링이 정착하는 데 걸리는 대략 시간 (기본 850ms) */
  duration?: number;
  color?: string;
};

// 계산 겹: 감쇠 조화진동자(스프링) 방정식을 매 프레임 직접 풀어 위치 값을 만든다 — easing 곡선을
// 빌려 쓰는 게 아니라 감쇠비(ZETA)·고유진동수(OMEGA) 로 목표를 넘었다가(오버슛) 되돌아오는 값을 계산한다.
const ZETA = 0.42;
const OMEGA = 9.5;
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);

function springProgress(tSec: number): number {
  if (tSec <= 0) return 0;
  const env = Math.exp(-ZETA * OMEGA * tSec);
  return 1 - env * (Math.cos(OMEGA_D * tSec) + ((ZETA * OMEGA) / OMEGA_D) * Math.sin(OMEGA_D * tSec));
}

export default function CartDrawerSlideSpringOvershoot({
  duration = 850,
  color = "#fff7e6",
}: CartDrawerSlideSpringOvershootProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const durationS = duration / 1000;

    function apply(v: number) {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return;
      const pct = (1 - v) * 100;
      panel.style.transform = `translateX(${pct.toFixed(2)}%)`;
      backdrop.style.opacity = Math.min(1, Math.max(0, v)).toFixed(3);
    }

    function run(closing: boolean) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      function frame(now: number) {
        const t = (now - start) / 1000;
        const raw = springProgress(Math.min(t, durationS));
        const v = closing ? 1 - raw : raw;
        apply(v);
        if (t < durationS) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          apply(closing ? 0 : 1);
          rafRef.current = null;
          isOpenRef.current = !closing;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    function stopAutoplay() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function onRealInput(closing: boolean) {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      run(closing);
    }

    const toggle = () => onRealInput(!!isOpenRef.current);
    const close = () => onRealInput(true);

    const toggleEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.toggle}`);
    const closeEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.close}`);
    toggleEl?.addEventListener("click", toggle);
    closeEl?.addEventListener("click", close);
    backdropRef.current?.addEventListener("click", close);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(1);
    } else {
      run(false);
      timerRef.current = setInterval(() => run(!!isOpenRef.current), 1050);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      toggleEl?.removeEventListener("click", toggle);
      closeEl?.removeEventListener("click", close);
      backdropRef.current?.removeEventListener("click", close);
    };
  }, [duration]);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div className={styles.page}>
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
        <button className={styles.toggle} type="button">장바구니 열기</button>
      </div>
      <div ref={backdropRef} className={styles.backdrop} />
      <aside ref={panelRef} className={styles.panel}>
        <header className={styles.head}>
          <span className={styles.title}>장바구니</span>
          <button className={styles.close} type="button" aria-label="닫기">
            <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z"/></g></svg>
          </button>
        </header>
        <ul className={styles.list}>
          <li className={styles.row}><span>코튼 티셔츠</span><b>$24</b></li>
          <li className={styles.row}><span>캔버스 백</span><b>$18</b></li>
          <li className={styles.row}><span>세라믹 머그</span><b>$12</b></li>
        </ul>
        <footer className={styles.foot}><span>합계</span><b>$54</b></footer>
      </aside>
    </div>
  );
}
