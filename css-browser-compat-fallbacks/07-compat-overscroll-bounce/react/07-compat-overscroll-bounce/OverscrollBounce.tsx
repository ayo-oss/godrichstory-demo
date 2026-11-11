// OverscrollBounce — vanilla 판(run/375/demo/07-compat-overscroll-bounce/index.html) 의 React 포트.
// 경계에 닿은 뒤의 남는 wheel 델타만 OVERSCROLL_LOCK_PX 안으로 눌러 담아 당김 캡을 늘이고, 스크롤 전파를 막는다.
import { useEffect, useRef } from "react";
import styles from "./OverscrollBounce.module.scss";

type Box<T> = { current: T };

const OVERSCROLL_LOCK_PX = 24; // 경계에서 더 당길 수 있는 최대치 — 변형 목표: 24 → 48
const STEP_MS = 70;

export default function OverscrollBounce() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const panelRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const pullCapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const panel = panelRef.current;
    const pullCap = pullCapRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !panel || !pullCap || !simToggle || !modeLabel) return;

    let isDemo = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    let pull = 0;
    let releaseTimer = 0;

    function atBottom() {
      return panel!.scrollTop + panel!.clientHeight >= panel!.scrollHeight - 1;
    }
    function atTop() { return panel!.scrollTop <= 0; }

    function setPull(px: number) {
      pull = Math.max(0, Math.min(OVERSCROLL_LOCK_PX, px));
      pullCap!.style.transform = "scaleY(" + (pull / OVERSCROLL_LOCK_PX) + ")";
    }

    function release() {
      setPull(0);
    }

    // 실제 wheel 리스너 — 경계에 닿은 뒤의 남는 델타만 당김으로 흡수하고 스크롤 전파(체이닝)를 막는다
    function onWheel(e: WheelEvent) {
      human();
      if (e.deltaY > 0 && atBottom()) {
        e.preventDefault();
        setPull(pull + e.deltaY * 0.4);
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(release, 220);
      } else if (e.deltaY < 0 && atTop() && pull > 0) {
        e.preventDefault();
        setPull(pull + e.deltaY * 0.4);
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(release, 220);
      }
    }
    panel.addEventListener("wheel", onWheel, { passive: false });

    function onScroll() { if (pull > 0 && !atBottom()) release(); }
    panel.addEventListener("scroll", onScroll);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "체이닝 새는판" : "체이닝 잠금판";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    let last = 0;
    let dir = 1;
    let holdUntil = 0;
    function autoAdvance(ts: number) {
      if (ts - last < STEP_MS) return;
      last = ts;
      if (ts < holdUntil) {
        // 경계에서 더 당기는 구간 — 실제 wheel 이 하는 것과 같은 setPull 호출
        setPull(pull + (dir > 0 ? 6 : -6));
        return;
      }
      const max = panel!.scrollHeight - panel!.clientHeight;
      const next = panel!.scrollTop + dir * 10;
      if (next >= max) { panel!.scrollTop = max; holdUntil = ts + 360; dir = -1; }
      else if (next <= 0) { panel!.scrollTop = 0; holdUntil = ts + 360; dir = 1; }
      else { panel!.scrollTop = next; }
    }

    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      if (isDemo && !reduce && pull > 0 && ts > holdUntil + 40) setPull(0);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      panel!.removeEventListener("wheel", onWheel);
      panel!.removeEventListener("scroll", onScroll);
      simToggle!.removeEventListener("click", onSimClick);
      window.clearTimeout(releaseTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.modeLabel} ref={modeLabelRef}>체이닝 잠금판</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
        <div className={styles.panelWrap}>
          <ul className={styles.panel} ref={panelRef}>
            <li>알림 규칙</li>
            <li>배지 색</li>
            <li>여백 표</li>
            <li>버튼 상태</li>
            <li>입력 검증</li>
            <li>접근성</li>
            <li>성능 측정</li>
            <li>배포 노트</li>
          </ul>
          <div className={styles.pullCap} ref={pullCapRef}></div>
        </div>
      </div>
    </main>
  );
}
