import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./RetryCountdown.module.scss";

// 실패 재시도 카운트다운 — runCountdown() 의 rAF 계산이 경과 시간을 ease-out 곡선에 넣어
// 남은 초 값과 링 길이(원둘레 × 남은 비율)를 매 순간 다시 구한다.
const WAIT_S = 3;
const FIRST_ATTEMPTS_FAIL = 1;
const LOAD_DELAY_MS = 480;
const MAX_BATCHES = 3;
const CIRC = 2 * Math.PI * 15.9;   // 원둘레 값 — 진행 링의 전체 길이

export default function RetryCountdown() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const [rows, setRows] = useState(5);
  const [status, setStatus] = useState("끝에 닿으면 다음 묶음을 부릅니다");
  const [counting, setCounting] = useState(false);
  const [seconds, setSeconds] = useState("3.0");
  const loadingRef = useRef(false);
  const countingRef = useRef(false);
  const attemptsRef = useRef(0);
  const batchesRef = useRef(0);
  const countdownRafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);
  const rowsRef = useRef(5);
  rowsRef.current = rows;

  // 계산 겹: 대기 시간 값은 정적 텍스트가 아니라 rAF 로 매 순간 다시 계산된다 — 경과 시간 값을
  // easing(ease-out)에 넣어 남은 초와 링 길이(원둘레 × 남은 비율)를 구한다.
  const runCountdown = useCallback((done: () => void) => {
    countingRef.current = true;
    setCounting(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const k = Math.min(elapsed / WAIT_S, 1);
      const eased = 1 - Math.pow(1 - k, 2);   // ease-out — 처음에 빨리 줄고 끝에서 느리게 멈춘다
      const remainS = WAIT_S * (1 - eased);
      setSeconds(remainS.toFixed(1));
      if (arcRef.current) {
        arcRef.current.style.strokeDashoffset = String(CIRC * eased);
      }
      if (k < 1) {
        countdownRafRef.current = window.requestAnimationFrame(tick);
      } else {
        countingRef.current = false;
        setCounting(false);
        done();   // 대기 시간 값이 0이 된 순간 같은 요청이 다시 나간다
      }
    };
    countdownRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const startLoad = useCallback(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loadingRef.current) { return; }
    loadingRef.current = true;
    sentinel.classList.add(styles["rcd__sentinel--loading"]);
    attemptsRef.current = (attemptsRef.current ?? 0) + 1;
    const fail = (attemptsRef.current ?? 0) <= FIRST_ATTEMPTS_FAIL;
    window.setTimeout(() => {
      loadingRef.current = false;
      sentinel.classList.remove(styles["rcd__sentinel--loading"]);
      if (fail) {
        setStatus("요청이 실패했습니다 — 잠시 뒤 다시 시도합니다");
        runCountdown(() => {
          setStatus("다시 시도 중입니다");
          startLoad();
        });
      } else {
        setRows((prev) => prev + 3);
        batchesRef.current = (batchesRef.current ?? 0) + 1;
        setStatus("묶음 " + (batchesRef.current ?? 0) + " 도착");
      }
    }, LOAD_DELAY_MS);
  }, [runCountdown]);

  const recompute = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    if (!view || !sentinel) { return; }
    const remaining = sentinel.getBoundingClientRect().top - view.getBoundingClientRect().bottom;
    if (remaining <= 2 && !loadingRef.current && !countingRef.current && (batchesRef.current ?? 0) < MAX_BATCHES) {
      startLoad();
    }
  }, [startLoad]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const onScroll = () => recompute();
    view.addEventListener("scroll", onScroll);
    const takeover = () => {
      rootRef.current?.classList.remove(styles["is-demo"]);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (countdownRafRef.current !== null) { window.cancelAnimationFrame(countdownRafRef.current); }
    };
    view.addEventListener("wheel", takeover, { passive: true });
    view.addEventListener("touchstart", takeover, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        const v = viewRef.current;
        if (!v) { return; }
        const max = v.scrollHeight - v.clientHeight;
        if ((batchesRef.current ?? 0) >= MAX_BATCHES && v.scrollTop >= max - 1 && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            setRows(5);
            batchesRef.current = 0;
            attemptsRef.current = 0;
            dirRef.current = 1;
            v.scrollTop = 0;
            setStatus("끝에 닿으면 다음 묶음을 부릅니다");
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
      if (countdownRafRef.current !== null) { window.cancelAnimationFrame(countdownRafRef.current); }
    };
  }, [recompute]);

  const rowEls = [];
  const total = rowsRef.current ?? 5;
  for (let i = 0; i < total; i += 1) {
    rowEls.push(
      <li key={i} className={styles["rcd__row"]}>오프라인 큐 {String(i + 1).padStart(2, "0")}</li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.rcd} ${styles["is-demo"]}`} id="rcd">
        <div className={styles["rcd__status"]} role="status">{status}</div>
        <div ref={viewRef} className={styles["rcd__view"]}>
          <ul className={styles["rcd__track"]}>
            {rowEls}
            <li ref={sentinelRef} className={styles["rcd__sentinel"]} aria-hidden="true">
              {counting && (
                <div className={styles["rcd__retry"]}>
                  <span className={styles["rcd__seconds"]}>{seconds}</span>
                  <svg className={styles["rcd__arc"]} viewBox="0 0 36 36" aria-hidden="true">
                    <circle className={styles["rcd__arc-track"]} cx="18" cy="18" r="15.9" />
                    <circle ref={arcRef} className={styles["rcd__arc-fill"]} cx="18" cy="18" r="15.9" />
                  </svg>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
