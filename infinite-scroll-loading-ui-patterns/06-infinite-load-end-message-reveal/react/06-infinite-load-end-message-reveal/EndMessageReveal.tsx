import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./EndMessageReveal.module.scss";

// 끝 도달 안내 — 남은 항목 값이 0으로 확정된 순간에만 revealEnd() 의 rAF 감쇠 계산이 실행된다.
// 계산 겹: 시작 값 REVEAL_PX 에서 목표 0 까지 지수 감쇠로 매 프레임 당긴다.
const TOTAL_PAGES = 3;
const PAGE_SIZE = 4;
const LOAD_DELAY_MS = 560;
const REVEAL_PX = 34;

export default function EndMessageReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(4);
  const [exhausted, setExhausted] = useState(false);
  const [hint, setHint] = useState("끝에 닿으면 다음 묶음을 부릅니다");
  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const rowsRef = useRef(4);
  rowsRef.current = rows;
  const exhaustedRef = useRef(false);
  exhaustedRef.current = exhausted;
  const revealRafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);

  // 계산 겹: 안내 문구의 올라오는 정도를 고정 트랜지션이 아니라 rAF 로 매 프레임 계산한다 —
  // 남은 항목 값이 0이 되기 전엔 이 계산 자체가 실행되지 않는다.
  const revealEnd = useCallback(() => {
    const endBox = endRef.current;
    if (!endBox) { return; }
    let y = REVEAL_PX;
    const tick = () => {
      y += (0 - y) * 0.18;
      endBox.style.transform = "translateY(" + y.toFixed(2) + "px)";
      if (y > 0.4) {
        revealRafRef.current = window.requestAnimationFrame(tick);
      } else {
        endBox.style.transform = "translateY(0px)";
        revealRafRef.current = null;
      }
    };
    revealRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const recompute = useCallback(() => {
    if (exhaustedRef.current) { return; }   // 남은 항목 값 0 — 끝에 닿아도 다시 계산하지 않는다
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    if (!view || !sentinel) { return; }
    const remaining = sentinel.getBoundingClientRect().top - view.getBoundingClientRect().bottom;
    if (remaining <= 2 && !loadingRef.current) {
      loadingRef.current = true;
      sentinel.classList.add(styles["emr__sentinel--loading"]);
      window.setTimeout(() => {
        pageRef.current = (pageRef.current ?? 0) + 1;
        setRows((prev) => prev + PAGE_SIZE);
        sentinel.classList.remove(styles["emr__sentinel--loading"]);
        loadingRef.current = false;
        if ((pageRef.current ?? 0) >= TOTAL_PAGES) {
          setExhausted(true);      // 남은 항목 값 0 확정 — 이 계산은 두 번 다시 일어나지 않는다
          revealEnd();
          setHint("남은 항목 값이 0입니다 — 더 닿아도 요청이 없습니다");
        }
      }, LOAD_DELAY_MS);
    }
  }, [revealEnd]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const onScroll = () => recompute();
    view.addEventListener("scroll", onScroll);
    const takeover = () => {
      rootRef.current?.classList.remove(styles["is-demo"]);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
    view.addEventListener("wheel", takeover, { passive: true });
    view.addEventListener("touchstart", takeover, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        const v = viewRef.current;
        if (!v) { return; }
        const max = v.scrollHeight - v.clientHeight;
        if (exhaustedRef.current && v.scrollTop >= max - 1 && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            setRows(4);
            pageRef.current = 0;
            setExhausted(false);
            dirRef.current = 1;
            v.scrollTop = 0;
            setHint("끝에 닿으면 다음 묶음을 부릅니다");
          }, 700);
          return;
        }
        if (dirRef.current === 0) { return; }
        v.scrollTop = Math.min(v.scrollTop + 5, max);
        recompute();
      }, 60);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (revealRafRef.current !== null) { window.cancelAnimationFrame(revealRafRef.current); }
    };
  }, [recompute]);

  const rowEls = [];
  for (let i = 0; i < rows; i += 1) {
    rowEls.push(
      <li key={i} className={styles["emr__row"]}>알림 {String(i + 1).padStart(2, "0")}</li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.emr} ${styles["is-demo"]}`} id="emr">
        <div ref={viewRef} className={styles["emr__view"]}>
          <ul className={styles["emr__track"]}>
            {rowEls}
            {!exhausted && (
              <li ref={sentinelRef} className={styles["emr__sentinel"]} aria-hidden="true" />
            )}
          </ul>
          {exhausted && (
            <div ref={endRef} className={styles["emr__end"]} role="status">
              <span className={styles["emr__end-check"]} aria-hidden="true" />
              <span className={styles["emr__end-text"]}>마지막 알림까지 다 불러왔습니다</span>
            </div>
          )}
        </div>
        <p className={styles["emr__hint"]}>{hint}</p>
      </div>
    </main>
  );
}
