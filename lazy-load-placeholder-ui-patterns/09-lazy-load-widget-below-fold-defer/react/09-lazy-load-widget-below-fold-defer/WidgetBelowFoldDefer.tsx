import { useEffect, useRef, useCallback, useState } from "react";
import styles from "./WidgetBelowFoldDefer.module.scss";

// requestIdleCallback 이 넘겨주는 유휴 남은시간(timeRemaining) 값을 매
// 콜백마다 누적해, 누적값이 목표 예산(IDLE_BUDGET_MS)에 닿는 순간에만
// 위젯 자리를 실제 내용으로 바꾼다.
const IDLE_BUDGET_MS = 260;
const IDLE_TIMEOUT_MS = 900;
const IDLE_TICK_CAP_MS = 40;
const CYCLE_GAP_MS = 1800;

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
type Win = typeof window & {
  requestIdleCallback?: (cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function WidgetBelowFoldDefer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [pct, setPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const accumulatedRef = useBox<number>(0);
  const runningRef = useBox<boolean>(false);
  const idleHandleRef = useBox<number | null>(null);

  const ric = useCallback((cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => {
    const w = window as Win;
    if (w.requestIdleCallback) { return w.requestIdleCallback(cb, opts); }
    const start = performance.now();
    return window.setTimeout(() => {
      cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (performance.now() - start)) });
    }, 40);
  }, []);

  const cic = useCallback((id: number) => {
    const w = window as Win;
    if (w.cancelIdleCallback) { w.cancelIdleCallback(id); return; }
    window.clearTimeout(id);
  }, []);

  const tick = useCallback((deadline: IdleDeadline) => {
    if (!runningRef.current) { return; }
    const got = deadline.didTimeout ? IDLE_TICK_CAP_MS : Math.min(deadline.timeRemaining(), IDLE_TICK_CAP_MS);
    accumulatedRef.current = Math.min(IDLE_BUDGET_MS, accumulatedRef.current + Math.max(got, 12));
    const next = Math.round((accumulatedRef.current / IDLE_BUDGET_MS) * 100);
    setPct(next);
    if (accumulatedRef.current >= IDLE_BUDGET_MS) {
      setLoaded(true);
      runningRef.current = false;
    } else {
      idleHandleRef.current = ric(tick, { timeout: IDLE_TIMEOUT_MS });
    }
  }, [accumulatedRef, idleHandleRef, ric, runningRef]);

  const start = useCallback(() => {
    if (runningRef.current) { return; }
    runningRef.current = true;
    accumulatedRef.current = 0;
    setPct(0);
    setLoaded(false);
    idleHandleRef.current = ric(tick, { timeout: IDLE_TIMEOUT_MS });
  }, [accumulatedRef, idleHandleRef, ric, runningRef, tick]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (idleHandleRef.current !== null) { cic(idleHandleRef.current); idleHandleRef.current = null; }
  }, [cic, idleHandleRef, runningRef]);

  const onReplay = useCallback(() => {
    setDemo(false);
    stop();
    start();
  }, [start, stop]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      accumulatedRef.current = IDLE_BUDGET_MS;
      setPct(100);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    let poll: number | null = null;
    let gap: number | null = null;
    function loop() {
      if (cancelled) { return; }
      start();
      poll = window.setInterval(() => {
        if (!loadedGuard()) { return; }
        if (poll !== null) { window.clearInterval(poll); }
        gap = window.setTimeout(() => {
          if (!cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
        }, CYCLE_GAP_MS);
      }, 60);
    }
    function loadedGuard() {
      return accumulatedRef.current >= IDLE_BUDGET_MS;
    }
    loop();
    return () => {
      cancelled = true;
      stop();
      if (poll !== null) { window.clearInterval(poll); }
      if (gap !== null) { window.clearTimeout(gap); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.liw} ${demo ? styles["is-demo"] : ""}`}>
        <div className={`${styles["liw__widget"]} ${loaded ? styles["liw__widget--loaded"] : ""}`}>
          <div className={styles["liw__placeholder"]}>
            <p className={styles["liw__label"]}>추천 위젯 자리</p>
            <div className={styles["liw__track"]}>
              <div className={styles["liw__bar"]} style={{ width: pct + "%" }} />
            </div>
            <p className={styles["liw__sub"]}>{"유휴 시간 확보 중 " + pct + "%"}</p>
          </div>
          <div className={styles["liw__content"]}>
            <div className={styles["liw__card"]} />
            <div className={styles["liw__card"]} />
            <div className={styles["liw__card"]} />
          </div>
        </div>
        <button type="button" className={styles["liw__replay"]} onClick={onReplay}>다시 보기</button>
      </div>
    </main>
  );
}
