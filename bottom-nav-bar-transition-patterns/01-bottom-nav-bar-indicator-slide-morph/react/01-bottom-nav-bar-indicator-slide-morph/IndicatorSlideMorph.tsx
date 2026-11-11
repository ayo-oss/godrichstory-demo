// IndicatorSlideMorph — vanilla 판(run/367/demo/01-bottom-nav-bar-indicator-slide-morph/index.html) 의 React 포트.
// 탭 폭·좌표를 getBoundingClientRect 로 실측하고, springTo() 감쇠 조화진동자가 인디케이터의
// x·width 를 매 프레임 목표로 당긴다(오버슛 포함) — CSS transition 이 아니라 rAF 계산이 위치를 만든다.
import { useEffect, useRef } from "react";
import styles from "./IndicatorSlideMorph.module.scss";

type Box<T> = { current: T };
type ClickEvt = { preventDefault(): void };

const HOLD_MS = 650; // 계산 겹 상수: 자동 루프가 각 탭에 머무는 시간
const SPRING_K = 210; // 계산 겹: 스프링 상수(위치·너비 공용)
const SPRING_C = 19; // 계산 겹: 감쇠 상수
const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
  { label: "검색", d: "M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80|.2#m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" },
  { label: "쇼핑", d: "M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8|.2#M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z" },
  { label: "프로필", d: "M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64|.2#M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" },
];

function Icon({ spec }: { spec: string }) {
  const [a, b] = spec.split("#");
  const [pathA, opacity] = a.split("|");
  return (
    <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true">
      <g fill="currentColor">
        <path d={pathA} opacity={opacity} />
        <path d={b} />
      </g>
    </svg>
  );
}

export default function IndicatorSlideMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const tabRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let activeIdx = 0;
    let rects: { x: number; w: number }[] = [];
    let posX = 0, velX = 0, posW = 0, velW = 0;
    let lastTs = 0, cycleStart = 0;

    function measure() {
      const track = trackRef.current;
      if (!track) return;
      const tRect = track.getBoundingClientRect();
      rects = tabRefs.current.map((t) => {
        if (!t) return { x: 0, w: 0 };
        const r = t.getBoundingClientRect();
        return { x: r.left - tRect.left, w: r.width };
      });
      if (!posW) { posX = rects[0].x; posW = rects[0].w; }
    }

    function setActive(idx: number) {
      activeIdx = idx;
      tabRefs.current.forEach((t, i) => {
        if (!t) return;
        t.classList.toggle(styles.isActive, i === idx);
        t.setAttribute("aria-current", i === idx ? "true" : "false");
      });
    }

    function springTo(pos: number, vel: number, target: number, dt: number): [number, number] {
      const acc = (target - pos) * SPRING_K - vel * SPRING_C;
      vel += acc * dt;
      pos += vel * dt;
      return [pos, vel];
    }

    function render() {
      const ind = indicatorRef.current;
      if (!ind) return;
      ind.style.transform = "translateX(" + posX.toFixed(2) + "px)";
      ind.style.width = posW.toFixed(2) + "px";
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function onTabClick(i: number) { return () => { human(); setActive(i); }; }
    const handlers = TABS.map((_, i) => onTabClick(i));
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", handlers[i]));

    function loop(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (isDemo) {
        const elapsed = ts - cycleStart;
        const idx = Math.floor(elapsed / HOLD_MS) % TABS.length;
        if (idx !== activeIdx) setActive(idx);
      }

      const target = rects[activeIdx] || rects[0] || { x: posX, w: posW };
      const rx = springTo(posX, velX, target.x, dt); posX = rx[0]; velX = rx[1];
      const rw = springTo(posW, velW, target.w, dt); posW = rw[0]; velW = rw[1];

      render();
      rafRef.current = requestAnimationFrame(loop);
    }

    function onResize() { measure(); }
    window.addEventListener("resize", onResize);
    measure();
    render();
    if (!reduce) { rafRef.current = requestAnimationFrame(loop); }

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", handlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.track} ref={trackRef}>
            <span className={styles.indicator} ref={indicatorRef} />
            {TABS.map((t, i) => (
              <button
                key={t.label}
                type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
              >
                <Icon spec={t.d} />
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
