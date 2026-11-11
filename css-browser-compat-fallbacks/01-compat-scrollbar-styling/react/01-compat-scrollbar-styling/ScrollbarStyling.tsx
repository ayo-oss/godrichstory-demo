// ScrollbarStyling — vanilla 판(run/375/demo/01-compat-scrollbar-styling/index.html) 의 React 포트.
// 표준 scrollbar-width/scrollbar-color 와 옛 ::-webkit-scrollbar 의사요소를 함께 선언하고,
// 트랙 점은 실제 scroll 이벤트에서 나온 비율(target)을 lerp 로 뒤따른다.
import { useEffect, useRef } from "react";
import styles from "./ScrollbarStyling.module.scss";

type Box<T> = { current: T };

const LERP_RATE = 0.22; // 트랙 점이 목표 위치를 따라붙는 비율 — 작을수록 관성이 크게 느껴진다
const STEP_MS = 520;

const ITEMS = ["설계 문서", "색상 토큰", "여백 규칙", "버튼 상태", "입력 검증", "접근성 점검", "성능 측정", "배포 노트"];

export default function ScrollbarStyling() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const listRef = useRef(null) as unknown as Box<HTMLOListElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const dotRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const list = listRef.current;
    const track = trackRef.current;
    const dot = dotRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !list || !track || !dot || !simToggle || !modeLabel) return;

    let isDemo = true;
    let target = 0;
    let shown = 0;

    function ratio() {
      const max = list!.scrollHeight - list!.clientHeight;
      return max > 0 ? list!.scrollTop / max : 0;
    }
    function onScroll() { target = ratio(); }
    list.addEventListener("scroll", onScroll);

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onPointerDown() { human(); }
    function onKeyDown() { human(); }
    list.addEventListener("pointerdown", onPointerDown);
    list.addEventListener("keydown", onKeyDown);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "폴백 흉내내기" : "표준 지원판";
    }
    function onSimClick() { human(); simOn = !simOn; setSim(simOn); }
    simToggle.addEventListener("click", onSimClick);

    let dir = 1;
    let last = 0;
    function autoAdvance(ts: number) {
      if (ts - last < STEP_MS) return;
      last = ts;
      const max = list!.scrollHeight - list!.clientHeight;
      let next = list!.scrollTop + dir * (max * 0.42);
      if (next >= max - 1) { next = max; dir = -1; }
      else if (next <= 1) { next = 0; dir = 1; }
      list!.scrollTop = next;
    }

    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      const trackH = track!.clientHeight - dot!.offsetHeight;
      if (reduce) { shown = target; } else { shown += (target - shown) * LERP_RATE; }
      dot!.style.transform = "translateY(" + Math.max(0, Math.min(trackH, shown * trackH)) + "px)";
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      list!.removeEventListener("scroll", onScroll);
      list!.removeEventListener("pointerdown", onPointerDown);
      list!.removeEventListener("keydown", onKeyDown);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.modeLabel} ref={modeLabelRef}>표준 지원판</span>
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
        <div className={styles.body}>
          <ol className={styles.itemList} ref={listRef}>
            {ITEMS.map(function (s) { return <li key={s}>{s}</li>; })}
          </ol>
          <div className={styles.track} ref={trackRef}>
            <div className={styles.trackDot} ref={dotRef}></div>
          </div>
        </div>
      </div>
    </main>
  );
}
