// ScrollHideReveal — vanilla 판(run/367/demo/05-bottom-nav-bar-scroll-hide-reveal/index.html) 의 React 포트.
// 자기 완결 스크롤 상자의 실제 scrollTop 변화량으로 속도(px/s)를 구하고, 비대칭 임계
// (VEL_HIDE·VEL_SHOW)와 비교해 목표를 정한 뒤 지수 평활(LERP_RATE)로 translateY 를 따라간다.
import { useEffect, useRef } from "react";
import styles from "./ScrollHideReveal.module.scss";

type Box<T> = { current: T };

const BAR_H = 58; // px, 숨을 때 내려가는 거리(바 자신의 높이)
const VEL_HIDE = 90; // px/s, 이 이상 빠르게 내려 스크롤하면 숨긴다
const VEL_SHOW = 40; // px/s, 이 이상 빠르게 올려 스크롤하면 보인다(임계가 비대칭 — 덜 민감하게 다시 나타남)
const LERP_RATE = 14; // 계산 겹: navY 목표 추종 지수 평활 상수(1/s)
const CYCLE_MS = 2200; // 계산 겹: 자동 루프 왕복 주기

const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
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

function triangle(t: number): number {
  const x = (t % CYCLE_MS) / CYCLE_MS;
  return x < 0.5 ? x * 2 : 2 - x * 2;
}

export default function ScrollHideReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const scrollRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let hiddenTarget = 0;
    let navY = 0;
    let lastScrollTop = 0;
    let lastTs = 0, cycleStart = 0;
    let maxScroll = 1;

    function measure() {
      const el = scrollRef.current;
      if (!el) return;
      maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    }

    function onScrollFrame(scrollTop: number, dtSec: number) {
      if (dtSec <= 0) return;
      const delta = scrollTop - lastScrollTop;
      lastScrollTop = scrollTop;
      const vel = delta / dtSec;
      if (scrollTop <= 2) {
        hiddenTarget = 0;
      } else if (vel > VEL_HIDE) {
        hiddenTarget = 1;
      } else if (vel < -VEL_SHOW) {
        hiddenTarget = 0;
      }
    }

    function render(dtSec: number) {
      const track = trackRef.current;
      if (!track) return;
      navY += (hiddenTarget * BAR_H - navY) * (1 - Math.exp(-LERP_RATE * dtSec));
      track.style.transform = "translateY(" + navY.toFixed(2) + "px)";
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    const scrollEl = scrollRef.current;
    ["wheel", "touchstart", "pointerdown"].forEach((evt) => {
      scrollEl?.addEventListener(evt, human, { passive: true });
    });

    const tabHandlers = tabRefs.current.map((_, i) => () => {
      human();
      tabRefs.current.forEach((o) => o?.classList.remove(styles.isActive));
      tabRefs.current[i]?.classList.add(styles.isActive);
    });
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", tabHandlers[i]));

    function loop(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dtSec = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const el = scrollRef.current;
      if (isDemo && el) {
        const st = triangle(ts - cycleStart) * maxScroll;
        el.scrollTop = st;
      }

      if (el) onScrollFrame(el.scrollTop, dtSec);
      render(dtSec);
      rafRef.current = requestAnimationFrame(loop);
    }

    function onResize() { measure(); }
    measure();
    window.addEventListener("resize", onResize);
    render(0);
    if (!reduce) { rafRef.current = requestAnimationFrame(loop); }

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      ["wheel", "touchstart", "pointerdown"].forEach((evt) => {
        scrollEl?.removeEventListener(evt, human);
      });
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", tabHandlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.scrollArea} ref={scrollRef}>
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row + " " + styles.rowPink} />
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row + " " + styles.rowPink} />
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
          <div className={styles.track} ref={trackRef}>
            {TABS.map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}>
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
