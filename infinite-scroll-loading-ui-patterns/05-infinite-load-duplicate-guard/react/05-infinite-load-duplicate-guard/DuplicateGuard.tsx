import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./DuplicateGuard.module.scss";

// 중복 호출 방지 — tryRequest() 가 마지막 요청 시각 값과의 차이를 계산해 대기 기준 안에서는
// 호출을 막고 막은 횟수만 센다. 센티넬이 붉게 깜빡이는 게 '막았다'는 계산의 증거다.
const COOLDOWN_MS = 900;
const LOAD_DELAY_MS = 540;
const MAX_BATCHES = 4;

export default function DuplicateGuard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const [rows, setRows] = useState(6);
  const [since, setSince] = useState("0ms");
  const [blocked, setBlocked] = useState(0);
  const loadingRef = useRef(false);
  const batchesRef = useRef(0);
  const blockedRef = useRef(0);
  const lastRequestAtRef = useRef(-99999);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);
  const uiTimerRef = useRef<number | null>(null);

  // 계산 겹: 호출 조건이 닿아도 마지막 요청 시각 값과 지금 시각 값의 차이를 계산해,
  // 그 값이 대기 기준보다 작은 동안은 요청을 걸지 않고 막은 횟수만 센다.
  const tryRequest = useCallback(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) { return false; }
    const now = performance.now();
    const sinceValue = now - (lastRequestAtRef.current ?? now);
    if (sinceValue < COOLDOWN_MS) {
      blockedRef.current = (blockedRef.current ?? 0) + 1;
      setBlocked(blockedRef.current ?? 0);
      sentinel.classList.add(styles["dgd__sentinel--blocked"]);
      window.setTimeout(() => sentinel.classList.remove(styles["dgd__sentinel--blocked"]), 180);
      return false;
    }
    lastRequestAtRef.current = now;
    loadingRef.current = true;
    sentinel.classList.add(styles["dgd__sentinel--loading"]);
    window.setTimeout(() => {
      setRows((prev) => prev + 3);
      loadingRef.current = false;
      batchesRef.current = (batchesRef.current ?? 0) + 1;
      sentinel.classList.remove(styles["dgd__sentinel--loading"]);
    }, LOAD_DELAY_MS);
    return true;
  }, []);

  const recompute = useCallback(() => {
    const view = viewRef.current;
    const sentinel = sentinelRef.current;
    if (!view || !sentinel) { return; }
    const remaining = sentinel.getBoundingClientRect().top - view.getBoundingClientRect().bottom;
    if (remaining <= 2 && !loadingRef.current && (batchesRef.current ?? 0) < MAX_BATCHES) {
      tryRequest();
    }
  }, [tryRequest]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    const onScroll = () => recompute();
    view.addEventListener("scroll", onScroll);
    const takeover = () => {
      rootRef.current?.classList.remove(styles["is-demo"]);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (uiTimerRef.current !== null) { window.clearInterval(uiTimerRef.current); }
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
            blockedRef.current = 0;
            setBlocked(0);
            lastRequestAtRef.current = -99999;
            v.scrollTop = 0;
            dirRef.current = 1;
          }, 600);
          return;
        }
        if (dirRef.current === 0) { return; }
        v.scrollTop = Math.min(v.scrollTop + 4, max);   // 끝에 붙어 연속 이벤트 → 방어 동작 유발
        recompute();
      }, 60);
      uiTimerRef.current = window.setInterval(() => {
        setSince(Math.round(performance.now() - (lastRequestAtRef.current ?? 0)) + "ms");
      }, 100);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (uiTimerRef.current !== null) { window.clearInterval(uiTimerRef.current); }
    };
  }, [recompute]);

  const rowEls = [];
  for (let i = 0; i < rows; i += 1) {
    rowEls.push(
      <li key={i} className={styles["dgd__row"]}>수신함 {String(i + 1).padStart(2, "0")}</li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.dgd} ${styles["is-demo"]}`} id="dgd">
        <div className={styles["dgd__meters"]}>
          <div className={styles["dgd__meter"]}>
            <span className={styles["dgd__meter-label"]}>마지막 요청 이후</span>
            <span className={styles["dgd__meter-value"]}>{since}</span>
          </div>
          <div className={styles["dgd__meter"]}>
            <span className={styles["dgd__meter-label"]}>막은 호출</span>
            <span className={styles["dgd__meter-value"]}>{blocked}회</span>
          </div>
        </div>
        <div ref={viewRef} className={styles["dgd__view"]}>
          <ul className={styles["dgd__track"]}>
            {rowEls}
            <li ref={sentinelRef} className={styles["dgd__sentinel"]} aria-hidden="true" />
          </ul>
        </div>
      </div>
    </main>
  );
}
