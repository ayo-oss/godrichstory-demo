import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./GalleryGridStaggerReveal.module.scss";

// 격자 위치(행+열) 값으로 지연 시간을 계산하는 맨해튼 거리 스태거.
const COLS = 3;
const ROWS = 2;
const STAGGER_STEP_MS = 90;
const START_DELAY_MS = 200;
const CYCLE_GAP_MS = 1600;
const CELL_COUNT = COLS * ROWS;

function delayFor(idx: number): number {
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  return START_DELAY_MS + (row + col) * STAGGER_STEP_MS;
}

type Box<T> = { current: T };
function useBox<T>(initial: T): Box<T> {
  return useRef(initial) as unknown as Box<T>;
}

export default function GalleryGridStaggerReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [loaded, setLoaded] = useState<boolean[]>(Array(CELL_COUNT).fill(false));
  const [badge, setBadge] = useState("불러오는 중");
  const timersRef = useBox<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, [timersRef]);

  const loadAll = useCallback((): number => {
    setLoaded(Array(CELL_COUNT).fill(false));
    setBadge("불러오는 중");
    let maxDelay = 0;
    for (let idx = 0; idx < CELL_COUNT; idx += 1) {
      const d = delayFor(idx);
      maxDelay = Math.max(maxDelay, d);
      const t = window.setTimeout(() => {
        setLoaded((prev) => prev.map((v, j) => (j === idx ? true : v)));
      }, d);
      timersRef.current.push(t);
    }
    const t2 = window.setTimeout(() => setBadge("전부 불러옴"), maxDelay + 120);
    timersRef.current.push(t2);
    return maxDelay + 120;
  }, [timersRef]);

  const onActivate = useCallback(() => {
    setDemo(false);
    clearTimers();
    loadAll();
  }, [clearTimers, loadAll]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      setLoaded(Array(CELL_COUNT).fill(true));
      setBadge("전부 불러옴");
      return;
    }
    let cancelled = false;
    let outer: number | null = null;
    let inner: number | null = null;
    function loop() {
      if (cancelled) { return; }
      clearTimers();
      const total = loadAll();
      outer = window.setTimeout(() => {
        if (cancelled || !rootRef.current?.classList.contains(styles["is-demo"])) { return; }
        inner = window.setTimeout(() => {
          if (!cancelled && rootRef.current?.classList.contains(styles["is-demo"])) { loop(); }
        }, 500);
      }, total + CYCLE_GAP_MS);
    }
    loop();
    return () => {
      cancelled = true;
      clearTimers();
      if (outer !== null) { window.clearTimeout(outer); }
      if (inner !== null) { window.clearTimeout(inner); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    }
    root?.addEventListener("keydown", onKeyDown);
    return () => root?.removeEventListener("keydown", onKeyDown);
  }, [onActivate]);

  return (
    <main className={styles.stage}>
      <div
        ref={rootRef}
        className={`${styles.lgs} ${demo ? styles["is-demo"] : ""}`}
        tabIndex={0}
        onClick={onActivate}
      >
        <div className={styles["lgs__badge"]}>{badge}</div>
        <div className={styles["lgs__grid"]}>
          {Array.from({ length: CELL_COUNT }).map((_, idx) => (
            <div key={idx} className={`${styles["lgs__cell"]} ${loaded[idx] ? styles["lgs__cell--loaded"] : ""}`}>
              <div className={styles["lgs__placeholder"]} />
              <div className={`${styles["lgs__photo"]} ${styles["lgs__photo--" + (idx % 4)]}`} />
            </div>
          ))}
        </div>
        <p className={styles["lgs__hint"]}>클릭하면 다시 불러옵니다</p>
      </div>
    </main>
  );
}
