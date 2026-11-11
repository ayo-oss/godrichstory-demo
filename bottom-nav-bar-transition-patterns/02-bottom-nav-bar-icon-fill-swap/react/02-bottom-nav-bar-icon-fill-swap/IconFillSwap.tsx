// IconFillSwap — vanilla 판(run/367/demo/02-bottom-nav-bar-icon-fill-swap/index.html) 의 React 포트.
// fillAmt(0~1) 를 지수 평활로 목표까지 움직이고, 활성화 순간엔 pulseScale() 감쇠 코사인
// 진동으로 아이콘이 살짝 튀어올랐다 가라앉는다 — 둘 다 rAF 계산, CSS transition 아님.
import { useEffect, useRef } from "react";
import styles from "./IconFillSwap.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 650; // 계산 겹 상수: 자동 루프가 각 탭에 머무는 시간
const FILL_RATE = 0.012; // 계산 겹: 채움 정도 지수 평활 상수(ms 기준)
const PULSE_DUR = 360; // ms, 활성화 순간 스케일 펄스 지속
const PULSE_FREQ = (2 * Math.PI * 1.6) / PULSE_DUR; // 계산 겹: 펄스 각속도
const PULSE_ZETA = 4.4; // 계산 겹: 펄스 감쇠 상수

const TABS = [
  { label: "홈",
    outline: ["M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120", "m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z"],
    fill: "M224 120v96a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8v-52a4 4 0 0 0-4-4h-40a4 4 0 0 0-4 4v52a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-96a16 16 0 0 1 4.69-11.31l80-80a16 16 0 0 1 22.62 0l80 80A16 16 0 0 1 224 120" },
  { label: "검색",
    outline: ["M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80", "m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72"],
    fill: "M168 112a56 56 0 1 1-56-56a56 56 0 0 1 56 56m61.66 117.66a8 8 0 0 1-11.32 0l-50.06-50.07a88 88 0 1 1 11.32-11.31l50.06 50.06a8 8 0 0 1 0 11.32M112 184a72 72 0 1 0-72-72a72.08 72.08 0 0 0 72 72" },
  { label: "쇼핑",
    outline: ["M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8", "M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z"],
    fill: "M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32" },
  { label: "프로필",
    outline: ["M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64", "M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56"],
    fill: "M230.93 220a8 8 0 0 1-6.93 4H32a8 8 0 0 1-6.92-12c15.23-26.33 38.7-45.21 66.09-54.16a72 72 0 1 1 73.66 0c27.39 8.95 50.86 27.83 66.09 54.16a8 8 0 0 1 .01 8" },
];

function pulseScale(t: number): number {
  if (t < 0 || t > PULSE_DUR) return 1;
  const amp = Math.exp(-PULSE_ZETA * (t / PULSE_DUR));
  return 1 + amp * (1 - Math.cos(PULSE_FREQ * t)) * 0.16;
}

export default function IconFillSwap() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const wrapRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let activeIdx = 0;
    const fillAmt = [1, 0, 0, 0];
    const pulseStart = [-9999, -9999, -9999, -9999];
    let cycleStart = 0, lastTs = 0;

    function setActive(idx: number, ts: number) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      pulseStart[idx] = ts;
      tabRefs.current.forEach((t, i) => {
        if (!t) return;
        t.classList.toggle(styles.isActive, i === idx);
        t.setAttribute("aria-current", i === idx ? "true" : "false");
      });
    }

    function render(ts: number) {
      wrapRefs.current.forEach((w, i) => {
        if (!w) return;
        const outline = w.children[0] as HTMLElement;
        const fill = w.children[1] as HTMLElement;
        const f = fillAmt[i];
        fill.style.opacity = f.toFixed(3);
        outline.style.opacity = (1 - f * 0.85).toFixed(3);
        const s = pulseScale(ts - pulseStart[i]);
        w.style.transform = "scale(" + s.toFixed(3) + ")";
      });
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    const handlers = TABS.map((_, i) => () => { human(); setActive(i, performance.now()); });
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", handlers[i]));

    function loop(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dt = ts - lastTs;
      lastTs = ts;

      if (isDemo) {
        const elapsed = ts - cycleStart;
        const idx = Math.floor(elapsed / HOLD_MS) % TABS.length;
        if (idx !== activeIdx) setActive(idx, ts);
      }

      for (let i = 0; i < TABS.length; i++) {
        const target = i === activeIdx ? 1 : 0;
        fillAmt[i] += (target - fillAmt[i]) * (1 - Math.exp(-FILL_RATE * dt));
      }

      render(ts);
      rafRef.current = requestAnimationFrame(loop);
    }

    render(0);
    if (!reduce) { rafRef.current = requestAnimationFrame(loop); }

    return () => {
      cancelAnimationFrame(rafRef.current);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", handlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.track}>
            {TABS.map((t, i) => (
              <button
                key={t.label}
                type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
              >
                <span className={styles.iconWrap} ref={(el: HTMLSpanElement | null) => { wrapRefs.current[i] = el; }}>
                  <svg className={styles.icon + " " + styles.iconOutline} viewBox="0 0 256 256" aria-hidden="true">
                    <g fill="currentColor"><path d={t.outline[0]} opacity=".2" /><path d={t.outline[1]} /></g>
                  </svg>
                  <svg className={styles.icon + " " + styles.iconFill} viewBox="0 0 256 256" aria-hidden="true">
                    <path fill="currentColor" d={t.fill} />
                  </svg>
                </span>
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
