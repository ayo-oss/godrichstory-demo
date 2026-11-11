// SafeAreaInsetResize — vanilla 판(run/367/demo/08-bottom-nav-bar-safe-area-inset-resize/index.html) 의
// React 포트. 계산 겹: 안전영역 인셋 값(0↔34px)을 지수 평활로 따라가며, 바의 총 높이를
// "콘텐츠 높이 + 인셋" 으로 매 프레임 다시 계산해 style.height 에 직접 쓴다.
import { useEffect, useRef } from "react";
import styles from "./SafeAreaInsetResize.module.scss";

type Box<T> = { current: T };

const BASE_H = 58; // px, 인셋 0일 때 바 콘텐츠 높이 — 계산 겹의 기준값
const INSET_ON = 34; // px, 계산 겹: 홈 인디케이터가 있는 기기의 안전영역 인셋(데모용 가정값)
const LERP_RATE = 10; // 인셋 값이 목표로 지수 평활되는 속도(1/s)
const CYCLE_MS = 2600; // 자동 루프 왕복 주기

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

export default function SafeAreaInsetResize() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const navRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const insetRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let manualOn = false;
    let insetTarget = 0;
    let insetPx = 0;
    let lastTs = 0, cycleStart = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render() {
      const nav = navRef.current, inset = insetRef.current;
      const indicator = indicatorRef.current, readout = readoutRef.current;
      if (!nav || !inset || !indicator || !readout) return;
      const totalH = BASE_H + insetPx;
      nav.style.height = totalH.toFixed(1) + "px";
      inset.style.height = insetPx.toFixed(1) + "px";
      const t = insetPx / INSET_ON;
      indicator.style.opacity = t.toFixed(3);
      indicator.style.transform = "translateY(" + ((1 - t) * 6).toFixed(1) + "px) scaleX(" + (0.6 + 0.4 * t).toFixed(3) + ")";
      readout.textContent = "인셋 " + Math.round(insetPx) + "px · 바 높이 " + Math.round(totalH) + "px";
    }

    function onToggleClick() {
      human();
      manualOn = !manualOn;
      insetTarget = manualOn ? INSET_ON : 0;
      if (toggleRef.current) {
        toggleRef.current.textContent = manualOn ? "홈 버튼 기기로 전환" : "홈 인디케이터 기기로 전환";
      }
    }
    function onToggleKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleRef.current?.click(); }
    }
    toggleRef.current?.addEventListener("click", onToggleClick);
    toggleRef.current?.addEventListener("keydown", onToggleKeydown);

    const tabHandlers = tabRefs.current.map((_, i) => () => {
      human();
      tabRefs.current.forEach((o) => o?.classList.remove(styles.isActive));
      tabRefs.current[i]?.classList.add(styles.isActive);
    });
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", tabHandlers[i]));

    function tick(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (isDemo && !reduce) {
        const cycleT = (ts - cycleStart) % CYCLE_MS;
        insetTarget = cycleT < CYCLE_MS / 2 ? INSET_ON : 0;
      }

      insetPx += (insetTarget - insetPx) * (1 - Math.exp(-LERP_RATE * dt));
      render();
      rafRef.current = requestAnimationFrame(tick);
    }

    render();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      toggleRef.current?.removeEventListener("click", onToggleClick);
      toggleRef.current?.removeEventListener("keydown", onToggleKeydown);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", tabHandlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.screen}>
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
          <div className={styles.nav} ref={navRef}>
            {TABS.map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}>
                <Icon spec={t.d} />
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
            <div className={styles.inset} ref={insetRef}>
              <span className={styles.homeIndicator} ref={indicatorRef} />
            </div>
          </div>
        </div>
        <div className={styles.info}>
          <span ref={readoutRef}>인셋 0px · 바 높이 58px</span>
          <button type="button" className={styles.toggle} ref={toggleRef}>홈 인디케이터 기기로 전환</button>
        </div>
      </div>
    </main>
  );
}
