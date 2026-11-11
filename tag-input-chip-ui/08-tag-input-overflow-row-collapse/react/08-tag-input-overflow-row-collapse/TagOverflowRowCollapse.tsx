// TagOverflowRowCollapse — vanilla 판(run/397/demo/08-tag-input-overflow-row-collapse/index.html) 의 React 포트.
// 계산 겹(뷰포트 폭 대 칩 누적 너비합 + 배지 예약폭 비교)은 vanilla 와 같은 값.
import { useEffect, useRef, useState } from "react";
import styles from "./TagOverflowRowCollapse.module.scss";

type Box<T> = { current: T };

const BADGE_RESERVE = 34; // 계산 겹 상수: 배지 자리 예약폭(px)
const GAP = 8;
const WORDS = ["기획", "디자인", "개발", "QA", "마케팅", "영업"];
const WIDE_MS = 900, NARROW_MS = 900, PAUSE_MS = 500;

export default function TagOverflowRowCollapse() {
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rowRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const rafRef = useRef(0) as unknown as Box<number>;

  const [isDemo, setIsDemo] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [width, setWidth] = useState(0);
  const [hidden, setHidden] = useState(0);
  const [visibleCount, setVisibleCount] = useState(WORDS.length);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function relayout() {
    const viewport = viewportRef.current;
    const row = rowRef.current;
    if (!viewport || !row) return;
    const chips = Array.prototype.slice.call(row.querySelectorAll("[data-chip]")) as HTMLElement[];
    const containerWidth = viewport.getBoundingClientRect().width;
    let sum = 0, shown = 0;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].getBoundingClientRect().width;
      const addGap = shown > 0 ? GAP : 0;
      const withThis = sum + addGap + w;
      const remaining = chips.length - (i + 1);
      const reserve = remaining > 0 ? GAP + BADGE_RESERVE : 0;
      if (withThis + reserve <= containerWidth) { sum = withThis; shown++; } else break;
    }
    setVisibleCount(shown);
    setWidth(Math.round(containerWidth));
    setHidden(chips.length - shown);
    setLive(chips.length - shown > 0 ? (chips.length - shown) + "개 태그 접힘" : "전체 표시");
  }

  useEffect(() => {
    relayout();
    const ro = window.ResizeObserver ? new ResizeObserver(() => relayout()) : null;
    if (ro && viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener("resize", relayout);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", relayout); };
  }, [narrow]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function pollDuring(ms: number, cb: () => void) {
      let t0 = 0;
      function step(ts: number) {
        if (!isDemoRef.current) return;
        if (!t0) t0 = ts;
        relayout();
        if (ts - t0 < ms) { rafRef.current = requestAnimationFrame(step); } else { relayout(); cb(); }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    function loop() {
      if (!isDemoRef.current) return;
      setNarrow(true);
      pollDuring(NARROW_MS, () => {
        timerRef.current = window.setTimeout(() => {
          if (!isDemoRef.current) return;
          setNarrow(false);
          pollDuring(WIDE_MS, () => { timerRef.current = window.setTimeout(loop, PAUSE_MS); });
        }, PAUSE_MS);
      });
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, 300);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => { window.clearTimeout(timerRef.current); cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onClick() {
    human();
    setNarrow((n) => !n);
  }

  return (
    <main className={styles.stage}>
      <div className={styles.ov + " " + (isDemo ? styles.isDemo : "")}>
        <div
          className={styles.viewport + " " + (narrow ? styles.viewportNarrow : "")}
          ref={viewportRef} onClick={onClick}
        >
          <div className={styles.row} ref={rowRef} role="list" aria-label="태그 목록, 좁아지면 접힘">
            {WORDS.map((w, i) => (
              <span key={w + i} data-chip className={styles.chip + " " + (i >= visibleCount ? styles.chipHidden : "")} role="listitem">{w}</span>
            ))}
            <span className={styles.badge + " " + (hidden > 0 ? styles.badgeShow : "")} role="listitem">{"+" + hidden}</span>
          </div>
        </div>
        <p className={styles.meta}>폭 <b>{width}</b>px · 접힌 태그 <b>{hidden}</b>개</p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
