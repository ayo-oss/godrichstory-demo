import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./LoadTriggerThreshold.module.scss";

// 로딩 시작 기준선 — recomputeThreshold() 가 스크롤 속도(px/ms)로 기준선 거리를 다시 계산한다.
// 빠르게 훑을수록 화면 끝에 닿기 전에 더 일찍 다음 목록을 부른다.
const BASE_THRESHOLD_PX = 40;
const MAX_THRESHOLD_PX = 220;
const SPEED_GAIN = 900;
const LOAD_DELAY_MS = 520;
const MAX_BATCHES = 5;

export default function LoadTriggerThreshold() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const [badge, setBadge] = useState("기준선 40px");
  const [rows, setRows] = useState(6);
  const loadingRef = useRef(false);
  const batchesRef = useRef(0);
  const lastTopRef = useRef(0);
  const lastTimeRef = useRef(0);
  const thresholdRef = useRef(BASE_THRESHOLD_PX);
  const phaseRef = useRef(0);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);

  // 계산 겹: 이번 스크롤 이벤트와 지난 이벤트 사이의 이동 거리 값을 걸린 시간 값으로 나눠
  // 속도(px/ms)를 구하고, 그 속도에 비례해 기준선 거리 값을 다시 계산한다.
  const recomputeThreshold = useCallback(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const now = performance.now();
    const dt = Math.max(now - (lastTimeRef.current ?? now), 1);
    const speed = Math.abs(view.scrollTop - (lastTopRef.current ?? 0)) / dt;
    lastTopRef.current = view.scrollTop;
    lastTimeRef.current = now;
    thresholdRef.current = Math.min(BASE_THRESHOLD_PX + speed * SPEED_GAIN, MAX_THRESHOLD_PX);
    setBadge("기준선 " + Math.round(thresholdRef.current) + "px");
  }, []);

  const recompute = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    const dot = dotRef.current;
    if (!view || !sentinel || !dot) { return; }
    recomputeThreshold();
    const remaining = sentinel.getBoundingClientRect().top - view.getBoundingClientRect().bottom;
    const threshold = thresholdRef.current ?? BASE_THRESHOLD_PX;
    dot.classList.toggle(styles["ltt__dot--armed"], remaining <= threshold);
    if (remaining <= threshold && !loadingRef.current && (batchesRef.current ?? 0) < MAX_BATCHES) {
      loadingRef.current = true;
      dot.classList.add(styles["ltt__dot--loading"]);
      window.setTimeout(() => {
        setRows((prev) => prev + 3);
        loadingRef.current = false;
        batchesRef.current = (batchesRef.current ?? 0) + 1;
        dot.classList.remove(styles["ltt__dot--loading"]);
      }, LOAD_DELAY_MS);
    }
  }, [recomputeThreshold]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
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
        if ((batchesRef.current ?? 0) >= MAX_BATCHES && v.scrollTop >= max - 1 && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            setRows(6);
            batchesRef.current = 0;
            phaseRef.current = 0;
            v.scrollTop = 0;
            lastTopRef.current = 0;
            dirRef.current = 1;
          }, 600);
          return;
        }
        if (dirRef.current === 0) { return; }
        phaseRef.current = (phaseRef.current ?? 0) + 1;
        const step = ((phaseRef.current ?? 0) % 40 < 20) ? 2 : 14;   // 느린/빠른 구간 번갈아
        v.scrollTop = Math.min(v.scrollTop + step, max);
        recompute();
      }, 55);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
  }, [recompute]);

  const rowEls = [];
  for (let i = 0; i < rows; i += 1) {
    rowEls.push(
      <li key={i} className={styles["ltt__row"]}>
        사진 스트림 {String(i + 1).padStart(2, "0")}
      </li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ltt} ${styles["is-demo"]}`} id="ltt">
        <div className={styles["ltt__badge"]}>{badge}</div>
        <div ref={viewRef} className={styles["ltt__view"]}>
          <ul className={styles["ltt__track"]}>
            {rowEls}
            <li ref={sentinelRef} className={styles["ltt__sentinel"]} aria-hidden="true">
              <span ref={dotRef} className={styles["ltt__dot"]} />
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
