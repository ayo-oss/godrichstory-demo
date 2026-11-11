// TabSlideDirectionIndex — vanilla 판(run/394/demo/02-tab-panel-slide-direction-index/index.html) 의 React 포트.
// select() 가 (새 인덱스 - 이전 인덱스) 의 부호로 방향을, 절댓값으로 건너뛴 칸 수를 구해
// 전환 시간(BASE_MS + (거리-1)*STEP_MS)을 늘린다.
import { useEffect, useRef } from "react";
import styles from "./TabSlideDirectionIndex.module.scss";

type Box<T> = { current: T };

const BASE_MS = 220; // 계산 겹 상수: 한 칸 이동의 기본 시간
const STEP_MS = 90; // 계산 겹 상수: 건너뛴 칸 하나마다 늘어나는 시간
const MAX_MS = 640;
const HOLD_MS = 700;
const COUNT = 4;
const SEQ = [1, 3, 0, 2];

export default function TabSlideDirectionIndex() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const distRef = useRef(null) as unknown as Box<HTMLElement>;
  const dirRef = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;
    let seqPos = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function select(idx: number) {
      if (idx === active) return;
      const track = trackRef.current, viewport = viewportRef.current;
      if (!track || !viewport) return;
      const delta = idx - active; // 계산 겹: 새 인덱스 - 이전 인덱스
      const dir = delta > 0 ? 1 : -1; // 계산 겹: 부호가 슬라이드 방향을 정한다
      const dist = Math.abs(delta); // 계산 겹: 건너뛴 칸 수
      const dur = Math.min(MAX_MS, BASE_MS + (dist - 1) * STEP_MS); // 계산 겹: 건너뛴 칸이 많을수록 오래 이동한다
      const w = viewport.clientWidth;

      track.style.setProperty("--sp-dur", dur.toFixed(0) + "ms");
      track.style.transform = "translateX(" + (-idx * w).toFixed(2) + "px)";

      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      const prevPanel = panelRefs.current[active], nextPanel = panelRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      prevPanel?.setAttribute("aria-hidden", "true");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");
      nextPanel?.setAttribute("aria-hidden", "false");

      if (distRef.current) distRef.current.textContent = String(dist);
      if (dirRef.current) dirRef.current.textContent = dir > 0 ? "→" : "←";
      active = idx;
    }

    function place(initial?: boolean) {
      const viewport = viewportRef.current, track = trackRef.current;
      if (!viewport || !track) return;
      const w = viewport.clientWidth; // 계산 겹: 패널 폭은 실측 뷰포트 폭
      panelRefs.current.forEach((p) => { if (p) p.style.width = w + "px"; });
      if (initial) track.style.transition = "none"; // 최초 배치는 transition 없이 — 측정 훼손 방지
      track.style.transform = "translateX(" + (-active * w).toFixed(2) + "px)";
      if (initial) { track.getBoundingClientRect(); track.style.transition = ""; }
    }

    function onKeydown(e: KeyboardEvent) {
      const idx = tabRefs.current.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1) return;
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (idx + 1) % COUNT;
      else if (e.key === "ArrowLeft") next = (idx - 1 + COUNT) % COUNT;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = COUNT - 1;
      if (next === null) return;
      e.preventDefault();
      human();
      tabRefs.current[next]?.focus({ preventScroll: true });
      select(next);
    }

    function onTabClick(i: number) { return () => { human(); select(i); }; }
    const clickHandlers = [0, 1, 2, 3].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);
    function onResize() { place(); }
    window.addEventListener("resize", onResize);

    function loop() {
      if (!isDemo) return;
      seqPos = (seqPos + 1) % SEQ.length;
      select(SEQ[seqPos]);
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    place(true);
    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("resize", onResize);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", clickHandlers[i]));
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const labels = ["1단계", "2단계", "3단계", "4단계"];

  return (
    <main className={styles.stage}>
      <div className={styles.sp + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="단계 탭">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{label}</button>
          ))}
        </div>
        <div className={styles.viewport} ref={viewportRef}>
          <div className={styles.track} ref={trackRef}>
            {[1, 2, 3, 4].map((n, i) => (
              <div
                key={n}
                className={styles.panel}
                role="tabpanel"
                tabIndex={0}
                aria-hidden={i === 0 ? "false" : "true"}
                ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
              >
                <span className={styles.num}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <p className={styles.meta}>
          이동 <b ref={distRef}>0</b>칸 · 방향 <b ref={dirRef}>-</b>
        </p>
      </div>
    </main>
  );
}
