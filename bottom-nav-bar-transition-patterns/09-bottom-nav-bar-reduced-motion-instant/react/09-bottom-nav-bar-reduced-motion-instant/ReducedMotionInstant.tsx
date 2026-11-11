// ReducedMotionInstant — vanilla 판(run/367/demo/09-bottom-nav-bar-reduced-motion-instant/index.html) 의
// React 포트. 패널 A(일반)는 easeOutCubic 을 rAF 로 직접 적분해 실제 경과시간(ms)을 화면에
// 그대로 찍고, 패널 B(축소)는 보간 없이 즉시 놓은 뒤 perf.now 차로 실제 지연시간을 측정해
// 찍는다 — 두 패널 다 CSS transition 이 아니라 계산이 위치를 만든다.
import { useEffect, useRef } from "react";
import styles from "./ReducedMotionInstant.module.scss";

type Box<T> = { current: T };
type Geo = { left: number; width: number; height: number };

const DURATION_MS = 320; // 계산 겹: 일반 패널의 전환 실제 시간(ms) — CSS transition 이 아니라 rAF 로 직접 적분
const CYCLE_MS = 700; // 자동 루프가 좌우 탭을 오가는 간격

const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
  { label: "쇼핑", d: "M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8|.2#M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z" },
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

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }

export default function ReducedMotionInstant() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackARef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorARef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutARef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const tabARefs = useRef([null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const trackBRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorBRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutBRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const tabBRefs = useRef([null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trackA = trackARef.current, indicatorA = indicatorARef.current, readoutA = readoutARef.current;
    const trackB = trackBRef.current, indicatorB = indicatorBRef.current, readoutB = readoutBRef.current;
    const tabsA = tabARefs.current, tabsB = tabBRefs.current;
    if (!trackA || !indicatorA || !readoutA || !trackB || !indicatorB || !readoutB) return;

    let isDemo = true;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function measure(track: HTMLDivElement, tabs: (HTMLButtonElement | null)[]): Geo[] {
      const trackRect = track.getBoundingClientRect();
      return tabs.map((t) => {
        const r = t!.getBoundingClientRect();
        return { left: r.left - trackRect.left, width: r.width, height: r.height };
      });
    }

    // ---- 패널 A: 일반 전환
    const geoA = measure(trackA, tabsA);
    indicatorA.style.width = geoA[0].width + "px";
    indicatorA.style.height = geoA[0].height + "px";
    let activeA = 0;
    let fromXA = geoA[0].left, toXA = geoA[0].left;
    let transStartA = 0;
    let transitioningA = false;
    indicatorA.style.transform = "translateX(" + geoA[0].left.toFixed(1) + "px)";

    function currentXA(ts: number) {
      if (!transitioningA) return toXA;
      const t = Math.min(1, (ts - transStartA) / DURATION_MS);
      return fromXA + (toXA - fromXA) * easeOutCubic(t);
    }
    function goToA(idx: number, ts: number) {
      activeA = idx;
      tabsA.forEach((t, i) => t?.classList.toggle(styles.isActive, i === idx));
      fromXA = currentXA(ts);
      toXA = geoA[idx].left;
      transStartA = ts;
      transitioningA = true;
    }

    // ---- 패널 B: 축소 모션 전환
    const geoB = measure(trackB, tabsB);
    indicatorB.style.width = geoB[0].width + "px";
    indicatorB.style.height = geoB[0].height + "px";
    let activeB = 0;
    let switchAtB = 0;
    let latencyMeasured = true;
    indicatorB.style.transform = "translateX(" + geoB[0].left.toFixed(1) + "px)";

    function goToB(idx: number, ts: number) {
      activeB = idx;
      tabsB.forEach((t, i) => t?.classList.toggle(styles.isActive, i === idx));
      indicatorB.style.transform = "translateX(" + geoB[idx].left.toFixed(1) + "px)";
      switchAtB = ts;
      latencyMeasured = false;
    }

    const handlersA = tabsA.map((_, i) => () => { human(); if (i !== activeA) goToA(i, performance.now()); });
    tabsA.forEach((t, i) => t?.addEventListener("click", handlersA[i]));
    const handlersB = tabsB.map((_, i) => () => { human(); if (i !== activeB) goToB(i, performance.now()); });
    tabsB.forEach((t, i) => t?.addEventListener("click", handlersB[i]));

    let cycleStart = 0;
    let lastCycleIdx = 0;

    function tick(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo && !reduce) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS);
        const idx = step % 2;
        if (idx !== lastCycleIdx) {
          lastCycleIdx = idx;
          if (idx !== activeA) goToA(idx, ts);
          if (idx !== activeB) goToB(idx, ts);
        }
      }

      if (transitioningA) {
        const x = currentXA(ts);
        indicatorA.style.transform = "translateX(" + x.toFixed(1) + "px)";
        const elapsed = Math.min(DURATION_MS, ts - transStartA);
        readoutA.textContent = Math.round(elapsed) + " / " + DURATION_MS + "ms";
        if (elapsed >= DURATION_MS) { transitioningA = false; }
      }

      if (!latencyMeasured) {
        const lat = ts - switchAtB;
        readoutB.textContent = Math.round(lat) + "ms (1프레임)";
        latencyMeasured = true;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      tabsA.forEach((t, i) => t?.removeEventListener("click", handlersA[i]));
      tabsB.forEach((t, i) => t?.removeEventListener("click", handlersB[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.panel}>
          <p className={styles.caption}>일반 전환</p>
          <div className={styles.track} ref={trackARef}>
            <div className={styles.indicatorA} ref={indicatorARef} />
            {TABS.map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabARefs.current[i] = el; }}>
                <Icon spec={t.d} />
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
          </div>
          <p className={styles.readout} ref={readoutARef}>0 / 320ms</p>
        </div>
        <div className={styles.panel}>
          <p className={styles.caption}>축소 모션 전환</p>
          <div className={styles.track + " " + styles.trackReduced} ref={trackBRef}>
            <div className={styles.indicatorB} ref={indicatorBRef} />
            {TABS.map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabBRefs.current[i] = el; }}>
                <Icon spec={t.d} />
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
          </div>
          <p className={styles.readout} ref={readoutBRef}>0ms</p>
        </div>
      </div>
    </main>
  );
}
