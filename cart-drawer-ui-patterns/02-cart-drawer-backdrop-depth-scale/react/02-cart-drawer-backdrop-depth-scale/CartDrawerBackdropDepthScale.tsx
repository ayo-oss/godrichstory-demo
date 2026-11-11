import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerBackdropDepthScale.module.scss";

export type CartDrawerBackdropDepthScaleProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 열림 진행 값(0~1)을 easeInOutCubic() 으로 보간해 뒤 화면의 크기 값과
// 어둡기 값을 같은 비율로 계산한다 — scale·filter 를 각자 애니메이션하지 않고 한 값에서 둘을 도출한다.
function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

const MIN_SCALE = 0.86;
const MAX_DIM = 0.5;

export default function CartDrawerBackdropDepthScale({
  duration = 500,
  color = "#17141a",
}: CartDrawerBackdropDepthScaleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const isOpenRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function apply(progress: number) {
      const page = pageRef.current;
      const panel = panelRef.current;
      if (!page || !panel) return;
      const eased = easeInOutCubic(Math.min(1, Math.max(0, progress)));
      const scale = 1 - eased * (1 - MIN_SCALE);
      const dim = eased * MAX_DIM;
      page.style.transform = `scale(${scale.toFixed(4)})`;
      page.style.filter = `brightness(${(1 - dim).toFixed(3)})`;
      panel.style.transform = `translateX(${((1 - eased) * 100).toFixed(2)}%)`;
    }

    function run(closing: boolean) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const from = closing ? 1 : 0;
      const to = closing ? 0 : 1;
      function frame(now: number) {
        const t = Math.min(1, (now - start) / duration);
        apply(from + (to - from) * t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
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

    const toggle = () => {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      run(!!isOpenRef.current);
    };
    const toggleEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.toggle}`);
    toggleEl?.addEventListener("click", toggle);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(1);
    } else {
      run(false);
      timerRef.current = setInterval(() => run(!!isOpenRef.current), 900);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      toggleEl?.removeEventListener("click", toggle);
    };
  }, [duration]);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div ref={pageRef} className={styles.page}>
        <div className={styles.bar} />
        <div className={styles.card} />
        <div className={styles.card} />
        <button className={styles.toggle} type="button">장바구니</button>
      </div>
      <aside ref={panelRef} className={styles.panel}>
        <header className={styles.head}><span>장바구니</span><b>3</b></header>
        <ul className={styles.list}>
          <li>운동화</li>
          <li>양말 세트</li>
          <li>물병</li>
        </ul>
      </aside>
    </div>
  );
}
