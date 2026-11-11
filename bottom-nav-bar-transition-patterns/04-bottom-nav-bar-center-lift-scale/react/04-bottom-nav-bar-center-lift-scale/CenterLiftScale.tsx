// CenterLiftScale — vanilla 판(run/367/demo/04-bottom-nav-bar-center-lift-scale/index.html) 의 React 포트.
// liftT(0~1) 를 springTo 감쇠 조화진동자로 목표까지 당기고, 그 값으로 translateY·scale 뿐 아니라
// box-shadow 의 blur·y오프셋·alpha 까지 매 프레임 다시 계산한다(들릴수록 그림자가 커지고 옅어지는
// 물리적 높이감) — CSS transition 이 아니라 rAF 계산이 만든다.
import { useEffect, useRef } from "react";
import styles from "./CenterLiftScale.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 900; // 계산 겹 상수: 자동 루프가 각 상태에 머무는 시간
const LIFT_PX = 22; // px, 완전히 들렸을 때 위로 이동하는 거리
const SCALE_MAX = 1.14; // 완전히 들렸을 때 배율
const SHADOW_BLUR_BASE = 6, SHADOW_BLUR_GAIN = 20; // 계산 겹: 들림 정도(liftT)에 따라 blur 를 늘린다
const SHADOW_Y_BASE = 2, SHADOW_Y_GAIN = 14; // 계산 겹: 들림 정도에 따라 그림자 y 오프셋을 늘린다(높이감)
const SHADOW_ALPHA_BASE = 0.32, SHADOW_ALPHA_GAIN = -0.10; // 계산 겹: 들릴수록 그림자가 옅어진다(광원과 멀어짐)
const SPRING_K = 190, SPRING_C = 18; // 계산 겹: liftT 스프링 상수·감쇠

const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
  { label: "검색", d: "M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80|.2#m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" },
  { label: "쇼핑", d: "M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8|.2#M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z" },
  { label: "프로필", d: "M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64|.2#M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" },
];

function Icon({ spec, className }: { spec: string; className?: string }) {
  const [a, b] = spec.split("#");
  const [pathA, opacity] = a.split("|");
  return (
    <svg className={className || styles.icon} viewBox="0 0 256 256" aria-hidden="true">
      <g fill="currentColor">
        <path d={pathA} opacity={opacity} />
        <path d={b} />
      </g>
    </svg>
  );
}

export default function CenterLiftScale() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const centerRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const tabRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let lifted = false;
    let liftT = 0, liftV = 0;
    let lastTs = 0, cycleStart = 0;

    function setLifted(v: boolean) {
      lifted = v;
      centerRef.current?.classList.toggle(styles.isLifted, v);
      tabRefs.current.forEach((t) => t?.classList.toggle(styles.isActive, false));
    }

    function render() {
      const center = centerRef.current;
      if (!center) return;
      const ty = -(LIFT_PX * liftT);
      const scale = 1 + (SCALE_MAX - 1) * liftT;
      const blur = SHADOW_BLUR_BASE + SHADOW_BLUR_GAIN * liftT;
      const y = SHADOW_Y_BASE + SHADOW_Y_GAIN * liftT;
      const alpha = Math.max(0.08, SHADOW_ALPHA_BASE + SHADOW_ALPHA_GAIN * liftT);
      center.style.transform = "translateY(" + ty.toFixed(2) + "px) scale(" + scale.toFixed(3) + ")";
      center.style.boxShadow = "0 " + y.toFixed(1) + "px " + blur.toFixed(1) + "px rgba(10, 20, 40," + alpha.toFixed(3) + ")";
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function onCenterClick() { human(); setLifted(!lifted); }
    centerRef.current?.addEventListener("click", onCenterClick);

    const tabHandlers = tabRefs.current.map((_, i) => () => {
      human(); setLifted(false);
      tabRefs.current.forEach((o) => o?.classList.remove(styles.isActive));
      tabRefs.current[i]?.classList.add(styles.isActive);
    });
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", tabHandlers[i]));

    function loop(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (isDemo) {
        const phase = Math.floor((ts - cycleStart) / HOLD_MS) % 2;
        setLifted(phase === 1);
      }

      const target = lifted ? 1 : 0;
      const acc = (target - liftT) * SPRING_K - liftV * SPRING_C;
      liftV += acc * dt;
      liftT += liftV * dt;

      render();
      rafRef.current = requestAnimationFrame(loop);
    }

    render();
    if (!reduce) { rafRef.current = requestAnimationFrame(loop); }

    return () => {
      cancelAnimationFrame(rafRef.current);
      centerRef.current?.removeEventListener("click", onCenterClick);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", tabHandlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.track}>
            {TABS.slice(0, 2).map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
                aria-current={i === 0 ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}>
                <Icon spec={t.d} />
                <span className={styles.label}>{t.label}</span>
              </button>
            ))}
            <div className={styles.centerSlot}>
              <button type="button" className={styles.center} ref={centerRef}>
                <svg className={styles.centerIcon} viewBox="0 0 256 256" aria-hidden="true">
                  <path fill="currentColor" d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8" />
                </svg>
              </button>
            </div>
            {TABS.slice(2).map((t, i) => (
              <button key={t.label} type="button"
                className={styles.tab}
                ref={(el: HTMLButtonElement | null) => { tabRefs.current[i + 2] = el; }}>
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
