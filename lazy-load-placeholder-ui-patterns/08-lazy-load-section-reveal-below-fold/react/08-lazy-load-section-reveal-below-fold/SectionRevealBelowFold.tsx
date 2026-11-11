import { useEffect, useRef, useCallback, useState } from "react";
import styles from "./SectionRevealBelowFold.module.scss";

// 스크롤 컨테이너의 scrollTop 값을 정해 둔 임계치(px)와 비교해 넘어선
// 순간에만 아래 섹션이 빈 자리에서 실제 내용으로 바뀐다.
const SCROLL_THRESHOLD_PX = 86;
const AUTOSCROLL_STEP_PX = 2.2;
const CYCLE_GAP_MS = 1400;

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function SectionRevealBelowFold() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [filled, setFilled] = useState(false);
  const userActiveRef = useBox<boolean>(false);
  const rafRef = useBox<number | null>(null);

  const checkThreshold = useCallback(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const over = view.scrollTop >= SCROLL_THRESHOLD_PX;
    setFilled((prev) => (prev === over ? prev : over));
  }, []);

  const takeover = useCallback(() => {
    if (userActiveRef.current) { return; }
    userActiveRef.current = true;
    setDemo(false);
  }, [userActiveRef]);

  const autoScrollTo = useCallback((target: number, onDone: () => void) => {
    function step() {
      const view = viewRef.current;
      if (userActiveRef.current || !view) { return; }
      const cur = view.scrollTop;
      const next = cur + (target > cur ? AUTOSCROLL_STEP_PX : -AUTOSCROLL_STEP_PX);
      if ((target > cur && next >= target) || (target < cur && next <= target)) {
        view.scrollTop = target;
        checkThreshold();
        onDone();
        return;
      }
      view.scrollTop = next;
      checkThreshold();
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }, [checkThreshold, rafRef, userActiveRef]);

  useEffect(() => {
    const view = viewRef.current;
    view?.addEventListener("scroll", checkThreshold);
    view?.addEventListener("wheel", takeover, { passive: true });
    view?.addEventListener("touchstart", takeover, { passive: true });
    return () => {
      view?.removeEventListener("scroll", checkThreshold);
      view?.removeEventListener("wheel", takeover);
      view?.removeEventListener("touchstart", takeover);
    };
  }, [checkThreshold, takeover]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const view = viewRef.current;
    if (reduce) {
      setDemo(false);
      if (view) { view.scrollTop = SCROLL_THRESHOLD_PX + 20; }
      checkThreshold();
      return;
    }
    let cancelled = false;
    let t1: number | null = null;
    let t2: number | null = null;
    function loop() {
      if (userActiveRef.current || cancelled) { return; }
      if (view) { view.scrollTop = 0; }
      checkThreshold();
      t1 = window.setTimeout(() => {
        if (userActiveRef.current || cancelled) { return; }
        autoScrollTo(140, () => {
          t2 = window.setTimeout(() => {
            if (!userActiveRef.current && !cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
          }, CYCLE_GAP_MS);
        });
      }, 500);
    }
    loop();
    return () => {
      cancelled = true;
      if (t1 !== null) { window.clearTimeout(t1); }
      if (t2 !== null) { window.clearTimeout(t2); }
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lsr} ${demo ? styles["is-demo"] : ""}`}>
        <div ref={viewRef} className={styles["lsr__view"]}>
          <div className={styles["lsr__pad"]} />
          <p className={styles["lsr__mark"]}>{"— 스크롤 임계선 —"}</p>
          <div className={`${styles["lsr__section"]} ${filled ? styles["lsr__section--filled"] : ""}`}>
            <div className={styles["lsr__empty"]}>빈 자리</div>
            <div className={styles["lsr__content"]}>
              <div className={styles["lsr__row"]} />
              <div className={styles["lsr__row"]} />
              <div className={styles["lsr__row"]} />
            </div>
          </div>
        </div>
        <p className={styles["lsr__hint"]}>스크롤해서 아래 섹션을 채워보세요</p>
      </div>
    </main>
  );
}
