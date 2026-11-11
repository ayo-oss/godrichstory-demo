import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerStickyCheckoutReveal.module.scss";

export type CartDrawerStickyCheckoutRevealProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 스크롤 진행률(0~1)을 매 프레임 lerp() 로 그림자 강도·bar 높이 값에 보간한다 —
// 스크롤 위치를 그대로 쓰지 않고 목표 값 쪽으로 매 프레임 조금씩 다가가는 관성 보간이다.
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function CartDrawerStickyCheckoutReveal({
  color = "#17141a",
}: CartDrawerStickyCheckoutRevealProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const shadowRef = useRef(0);
  const maxScrollRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const autoplayRafRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const bar = barRef.current;
    if (!scrollEl || !bar) return;

    function computeMax() {
      maxScrollRef.current = Math.max(1, (scrollEl as HTMLDivElement).scrollHeight - (scrollEl as HTMLDivElement).clientHeight);
    }

    function tick() {
      const target = Math.min(1, scrollEl!.scrollTop / (maxScrollRef.current ?? 1));
      const shadow = lerp(shadowRef.current ?? 0, target, 0.18);
      shadowRef.current = shadow;
      bar!.style.setProperty("--shadow-op", shadow.toFixed(3));
      bar!.style.transform = `translateY(${(-shadow * 2).toFixed(2)}px)`;
      if (Math.abs(target - shadow) > 0.002) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }
    function kick() {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    }

    function stopAutoplay() {
      if (autoplayRafRef.current) {
        cancelAnimationFrame(autoplayRafRef.current);
        autoplayRafRef.current = null;
      }
    }

    function stopOnRealInput() {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
    }

    scrollEl.addEventListener("wheel", stopOnRealInput, { passive: true });
    scrollEl.addEventListener("pointerdown", stopOnRealInput);
    scrollEl.addEventListener("scroll", kick);
    window.addEventListener("resize", computeMax);

    computeMax();

    const CYCLE_MS = 1600;
    function autoLoop(now: number) {
      const p = (now % CYCLE_MS) / CYCLE_MS;
      const tri = p < 0.5 ? p * 2 : 2 - p * 2;
      const maxScroll = maxScrollRef.current ?? 1;
      scrollEl!.scrollTop = tri * maxScroll;
      const target = Math.min(1, scrollEl!.scrollTop / maxScroll);
      const shadow = lerp(shadowRef.current ?? 0, target, 0.18);
      shadowRef.current = shadow;
      bar!.style.setProperty("--shadow-op", shadow.toFixed(3));
      bar!.style.transform = `translateY(${(-shadow * 2).toFixed(2)}px)`;
      autoplayRafRef.current = requestAnimationFrame(autoLoop);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRafRef.current = requestAnimationFrame(autoLoop);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scrollEl.removeEventListener("wheel", stopOnRealInput);
      scrollEl.removeEventListener("pointerdown", stopOnRealInput);
      scrollEl.removeEventListener("scroll", kick);
      window.removeEventListener("resize", computeMax);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div className={styles.panel}>
        <div ref={scrollRef} className={styles.scroll}>
          <ul className={styles.list}>
            <li className={styles.row}><span>텀블러</span><b>$16</b></li>
            <li className={styles.row}><span>노트</span><b>$8</b></li>
            <li className={styles.row}><span>파우치</span><b>$14</b></li>
            <li className={styles.row}><span>키링</span><b>$6</b></li>
            <li className={styles.row}><span>양초</span><b>$18</b></li>
          </ul>
        </div>
        <footer ref={barRef} className={styles.bar}>
          <span>합계</span>
          <b>$62</b>
        </footer>
      </div>
    </div>
  );
}
