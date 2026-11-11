import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import styles from "./BottomSpinnerFade.module.scss";

// 하단 스피너 페이드 — 스피너 불투명도는 남은 스크롤 거리 값에서 매번 다시 계산된다.
// 계산 겹: getBoundingClientRect 로 잰 sentinel 상단-뷰 하단 거리를 임계 거리로 나눠 0~1 진행값.
const TOPICS = ["알림", "메모", "사진", "노래", "일정", "문서"];
const THRESHOLD_PX = 96;
const LOAD_DELAY_MS = 620;
const BATCH_SIZE = 3;
const MAX_ROWS = 21;
const AUTOPLAY_STEP_PX = 6;

type Spin = { angle: number };

export default function BottomSpinnerFade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const [rowCount, setRowCount] = useState(6);
  const [hint, setHint] = useState("끝까지 내리면 다음 묶음을 불러옵니다");
  const loadingRef = useRef(false);
  const spinRef = useRef<Spin>({ angle: 0 });
  const spinRafRef = useRef<number | null>(null);
  const rowCountRef = useRef(6);
  rowCountRef.current = rowCount;
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);

  const addRows = useCallback((count: number) => {
    setRowCount((prev) => Math.min(prev + count, MAX_ROWS));
  }, []);

  const spinTick = useCallback(() => {
    const spin = spinRef.current ?? { angle: 0 };
    spin.angle = (spin.angle + 9) % 360;
    if (ringRef.current) {
      ringRef.current.style.transform = `rotate(${spin.angle}deg)`;
    }
    if (loadingRef.current) {
      spinRafRef.current = window.requestAnimationFrame(spinTick);
    }
  }, []);

  // 계산 겹: 남은 스크롤 거리 값을 임계 거리로 나눠 0~1 진행값을 만들고 그 값을
  // 스피너 불투명도로 그대로 쓴다 — 표시 시간이 아니라 거리 값 하나로 짙기가 정해진다.
  const recomputeFade = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    const ring = ringRef.current;
    if (!view || !sentinel || !ring) { return; }
    const viewBottom = view.getBoundingClientRect().bottom;
    const sentinelTop = sentinel.getBoundingClientRect().top;
    const remaining = sentinelTop - viewBottom;
    const progress = 1 - Math.min(Math.max(remaining / THRESHOLD_PX, 0), 1);
    ring.style.opacity = String(progress);
    const count = rowCountRef.current ?? 0;
    setHint(remaining <= 0 && count >= MAX_ROWS
      ? "더 내리면 처음으로 되돌아갑니다"
      : "끝까지 내리면 다음 묶음을 불러옵니다");
    if (remaining <= 0 && !loadingRef.current && count < MAX_ROWS) {
      loadingRef.current = true;
      spinRafRef.current = window.requestAnimationFrame(spinTick);
      window.setTimeout(() => {
        addRows(BATCH_SIZE);
        loadingRef.current = false;
        if (spinRafRef.current !== null) { window.cancelAnimationFrame(spinRafRef.current); }
      }, LOAD_DELAY_MS);
    }
  }, [addRows, spinTick]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const onScroll = () => recomputeFade();
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
        const count = rowCountRef.current ?? 0;
        if (count >= MAX_ROWS && v.scrollTop >= max - 1 && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            setRowCount(6);
            v.scrollTop = 0;
            dirRef.current = 1;
            recomputeFade();
          }, 500);
          return;
        }
        if (dirRef.current === 0) { return; }
        v.scrollTop = Math.min(v.scrollTop + AUTOPLAY_STEP_PX, max);
        recomputeFade();
      }, 60);
    }
    recomputeFade();
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (spinRafRef.current !== null) { window.cancelAnimationFrame(spinRafRef.current); }
    };
  }, [recomputeFade]);

  const rows: ReactNode[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    rows.push(
      <li key={i} className={styles["bsf__row"]}>
        {TOPICS[i % TOPICS.length]} {String(i + 1).padStart(2, "0")}
      </li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.bsf} ${styles["is-demo"]}`} id="bsf">
        <div ref={viewRef} className={styles["bsf__view"]} tabIndex={0}>
          <ul ref={trackRef} className={styles["bsf__track"]} aria-live="polite">
            {rows}
            <li ref={sentinelRef} className={styles["bsf__sentinel"]} aria-hidden="true">
              <span ref={ringRef} className={styles["bsf__ring"]} />
            </li>
          </ul>
        </div>
        <p className={styles["bsf__hint"]}>{hint}</p>
      </div>
    </main>
  );
}
