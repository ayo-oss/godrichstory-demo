import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CartDrawerEmptyStateCrossfade.module.scss";

export type CartDrawerEmptyStateCrossfadeProps = {
  duration?: number;
  color?: string;
};

// 계산 겹: 하나의 진행값(p, 0~1)을 이징해 두 상태의 opacity 를 서로 반대 방향으로 동시에
// 계산한다(crossfadeApply()) — 두 애니메이션을 따로 걸지 않고 한 값에서 상보적으로 도출한다.
function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

const DUR_MS = 420;

export default function CartDrawerEmptyStateCrossfade({
  color = "#17141a",
}: CartDrawerEmptyStateCrossfadeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const emptyRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const hasItemsRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function crossfadeApply(p: number, toItems: boolean) {
      const list = listRef.current;
      const empty = emptyRef.current;
      if (!list || !empty) return;
      const eased = easeInOutCubic(p);
      const itemsOpacity = toItems ? eased : 1 - eased;
      const emptyOpacity = 1 - itemsOpacity;
      list.style.opacity = itemsOpacity.toFixed(3);
      list.style.transform = `scale(${(0.96 + itemsOpacity * 0.04).toFixed(3)})`;
      empty.style.opacity = emptyOpacity.toFixed(3);
      empty.style.transform = `scale(${(0.96 + emptyOpacity * 0.04).toFixed(3)})`;
    }

    function run(toItems: boolean) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      function frame(now: number) {
        const p = Math.min(1, (now - start) / DUR_MS);
        crossfadeApply(p, toItems);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          rafRef.current = null;
          hasItemsRef.current = toItems;
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

    const onToggle = () => {
      rootRef.current?.classList.remove(styles.isDemo);
      stopAutoplay();
      run(!hasItemsRef.current);
    };
    const toggleEl = rootRef.current?.querySelector<HTMLButtonElement>(`.${styles.toggle}`);
    toggleEl?.addEventListener("click", onToggle);

    crossfadeApply(0, false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timerRef.current = setInterval(() => run(!hasItemsRef.current), 1300);
    }

    return () => {
      stopAutoplay();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      toggleEl?.removeEventListener("click", onToggle);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ "--color": color } as CSSProperties}>
      <div className={styles.panel}>
        <header className={styles.head}>장바구니</header>
        <div className={styles.body}>
          <div ref={emptyRef} className={styles.empty}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="34" height="34"><g fill="currentColor" opacity=".6"><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Z"/></g></svg>
            </span>
            <p className={styles.msg}>장바구니가 비어 있어요</p>
          </div>
          <ul ref={listRef} className={styles.list}>
            <li className={styles.row}><span>가죽 지갑</span><b>$36</b></li>
            <li className={styles.row}><span>선글라스</span><b>$29</b></li>
          </ul>
        </div>
        <button className={styles.toggle} type="button">담기 / 비우기</button>
      </div>
    </div>
  );
}
