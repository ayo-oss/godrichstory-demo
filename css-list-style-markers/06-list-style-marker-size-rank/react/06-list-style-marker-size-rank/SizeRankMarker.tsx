// SizeRankMarker — vanilla 판(run/373/demo/06-list-style-marker-size-rank/index.html) 의 React 포트.
// ::marker 는 transform(scale) 을 지원하지 않아 면적을 키울 수 없다 — list-style:none 으로 지우고
// 실제 span(.chip) 을 마커 자리에 넣어 항상 최대 지름을 기준으로 scale() 만 줄인다.
import { useEffect, useRef } from "react";
import styles from "./SizeRankMarker.module.scss";

type Box<T> = { current: T };

// 결정적 집계 프리셋 3세트를 순환한다(Math.random 미사용)
const SETS: Array<{ a: number; b: number; c: number; d: number }> = [
  { a: 82, b: 64, c: 47, d: 20 },
  { a: 30, b: 90, c: 55, d: 65 },
  { a: 58, b: 22, c: 88, d: 41 },
];
const STEP_MS = 550; // 자동 루프에서 다음 집계로 넘어가는 간격

const NOTES: Array<{ key: string; label: string }> = [
  { key: "a", label: "아침 루틴 가이드" },
  { key: "b", label: "홈트레이닝 30일" },
  { key: "c", label: "식단 기록법" },
  { key: "d", label: "수면 개선 노트" },
];

export default function SizeRankMarker() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const list = listRef.current;
    if (!root || !list) return;

    const items = Array.prototype.slice.call(list.querySelectorAll("li"));
    const markers = items.map(function (li: HTMLElement) {
      const m = document.createElement("span");
      m.className = styles.chip;
      m.setAttribute("aria-hidden", "true");
      li.insertBefore(m, li.firstChild);
      return m;
    });
    let isDemo = true;
    let setIdx = 0;

    // 계산 겹: 마커 반경은 값의 제곱근에 비례한다(면적이 값에 비례하도록) — 선형 비례는 큰 값이 과장돼 보인다.
    function apply(set: { a: number; b: number; c: number; d: number }) {
      const max = Math.max.apply(null, Object.keys(set).map(function (k) { return (set as Record<string, number>)[k]; }));
      items.forEach(function (li: HTMLElement, i: number) {
        const key = li.getAttribute("data-key") || "a";
        const v = (set as Record<string, number>)[key];
        const factor = Math.sqrt(v) / Math.sqrt(max);
        markers[i].style.setProperty("--scale", factor.toFixed(3));
      });
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function next() {
      setIdx = (setIdx + 1) % SETS.length;
      apply(SETS[setIdx]);
    }

    function onClick() { human(); next(); }
    root!.addEventListener("click", onClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo) {
        if (reduce) {
          apply(SETS[1]); // 계산은 유지, 시간 축소 대신 두 번째 집계 상태로 즉시 고정
        } else if (ts - last >= STEP_MS) {
          last = ts;
          next();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    apply(SETS[0]);

    return () => {
      root!.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <ul className={styles.statList} ref={listRef}>
          {NOTES.map(function (n) { return <li key={n.key} data-key={n.key}>{n.label}</li>; })}
        </ul>
        <button className={styles.cycle} type="button">다음 집계 값 보기</button>
      </div>
    </main>
  );
}
