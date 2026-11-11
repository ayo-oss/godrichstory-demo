import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./VirtualWindowRecalc.module.scss";

// 가상 윈도우 재계산 — renderWindow() 가 scrollTop 값에서 보이는 인덱스 범위를 다시 구해
// 그 범위만 DOM 에 그린다. 위·아래 spacer 높이도 범위 값에서 다시 계산된다.
const TOTAL_ROWS = 999;
const ROW_H = 26;
const OVERSCAN = 2;
const GROW_PER_TICK = 8;

export default function VirtualWindowRecalc() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const topSpacerRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(96);
  const [rangeText, setRangeText] = useState("행 0 - 11 / 96");
  const [domText, setDomText] = useState("그린 행 12");
  const renderedRef = useRef("");
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);
  const availableRef = useRef(96);
  availableRef.current = available;

  // 계산 겹: scrollTop 값으로 지금 보이는 인덱스 범위(start..end)를 다시 구하고, 그 범위 밖의
  // 행은 DOM 에 없다. 위·아래 여백(spacer) 높이도 범위 값에서 다시 계산해 전체 높이는 유지한다.
  const renderWindow = useCallback(() => {
    const view = viewRef.current;
    const top = topSpacerRef.current;
    const bottom = bottomSpacerRef.current;
    if (!view || !top || !bottom) { return; }
    const avail = availableRef.current ?? 0;
    const first = Math.floor(view.scrollTop / ROW_H) - OVERSCAN;
    const visible = Math.ceil(view.clientHeight / ROW_H) + OVERSCAN * 2;
    const start = Math.max(0, Math.min(first, avail - visible));
    const end = Math.min(avail, start + visible);
    const key = start + ":" + end;
    if (renderedRef.current === key) { return; }
    renderedRef.current = key;
    // 범위를 CSS 변수로 넘겨 행 리스트는 범위 밖을 그리지 않는다
    view.style.setProperty("--vstart", String(start));
    view.style.setProperty("--vend", String(end));
    top.style.height = (start * ROW_H) + "px";
    bottom.style.height = Math.max(0, (avail - end) * ROW_H) + "px";
    setRangeText("행 " + start + " - " + (end - 1) + " / " + avail);
    setDomText("그린 행 " + (end - start));
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    renderWindow();
    const onScroll = () => renderWindow();
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
        if ((availableRef.current ?? 0) < TOTAL_ROWS) {
          setAvailable((prev) => Math.min(prev + GROW_PER_TICK, TOTAL_ROWS));   // 목록이 계속 늘어난다
        }
        const max = v.scrollHeight - v.clientHeight;
        const d = dirRef.current ?? 1;
        if (d > 0 && v.scrollTop >= max - 1) { dirRef.current = -1; }
        if (d < 0 && v.scrollTop <= 0) { dirRef.current = 1; }
        v.scrollTop = Math.min(Math.max(v.scrollTop + 7 * (dirRef.current ?? 1), 0), max);
        renderWindow();
      }, 60);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
  }, [renderWindow]);

  // 렌더링은 상태(rangeText)와 분리 — 범위 값으로 직접 행을 만든다
  const view = viewRef.current;
  const start = Number((view && view.style.getPropertyValue("--vstart")) || 0);
  const end = Number((view && view.style.getPropertyValue("--vend")) || 12);
  const rowEls = [];
  for (let i = start; i < end; i += 1) {
    rowEls.push(
      <li key={i} className={styles["vwr__row"]}>행 {String(i + 1).padStart(3, "0")}</li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.vwr} ${styles["is-demo"]}`} id="vwr">
        <div className={styles["vwr__stats"]}>
          <span className={styles["vwr__stat"]}>{rangeText}</span>
          <span className={styles["vwr__stat"]}>{domText}</span>
        </div>
        <div ref={viewRef} className={styles["vwr__view"]}>
          <div ref={topSpacerRef} className={styles["vwr__spacer"]} aria-hidden="true" />
          <ul className={styles["vwr__window"]}>{rowEls}</ul>
          <div ref={bottomSpacerRef} className={styles["vwr__spacer"]} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
