// LongpressReveal — vanilla 판(run/367/demo/06-bottom-nav-bar-longpress-reveal/index.html) 의 React 포트.
// 누른 시간(ms)을 HOLD_MS 로 나눈 비율을 svg 원의 실제 둘레(2*PI*r)에 곱해 stroke-dashoffset 을
// 계산하고, 다 차면(1) 메뉴를 연다. 메뉴 3항목의 위치는 FAB 중심에서 각도(FAN_ANGLES)를
// sin/cos 로 변환해 자리를 잡는다 — 전부 rAF 계산, CSS transition 아님.
import { useEffect, useRef } from "react";
import styles from "./LongpressReveal.module.scss";

type Box<T> = { current: T };
type PtrEvt = { clientX: number; clientY: number; pointerId: number };

const HOLD_MS = 650; // 계산 겹: 이 길이만큼 눌러야 링이 다 차서 메뉴가 열린다
const OPEN_MS = 900; // 열린 채로 머무는 시간(자동 루프용)
const CYCLE_MS = 2600; // 자동 루프 왕복 주기
const RING_R = 27; // svg 링 반지름(px, viewBox 좌표) — 원둘레 계산의 재료
const RING_CIRC = 2 * Math.PI * RING_R; // 계산 겹: 원둘레를 실제로 계산해 stroke-dashoffset 에 쓴다
const SPRING_RATE = 16; // 지수 평활 상수(1/s) — 뗄 때 링이 되돌아가는 속도
const MENU_RATE = 20; // 메뉴 등장/퇴장 지수 평활 상수(1/s)
const FAN_R = 62; // 부채꼴 반경(px) — 액션 버튼이 FAB 로부터 떨어지는 거리
const FAN_ANGLES = [-150, -90, -30]; // 계산 겹: 각 액션 버튼의 각도(도) — sin/cos 로 좌표를 만든다

const ACTIONS = [
  { label: "알림", d: "M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12|.2#M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" },
  { label: "메시지", d: "M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128|.2#M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-6.54-.67L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216" },
  { label: "좋아요", d: "M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54|.2#M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" },
];

const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
  { label: "쇼핑", d: "M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8|.2#M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z" },
  { label: "프로필", d: "M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64|.2#M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" },
];

function Icon({ spec, cls }: { spec: string; cls?: string }) {
  const [a, b] = spec.split("#");
  const [pathA, opacity] = a.split("|");
  return (
    <svg className={cls} viewBox="0 0 256 256" aria-hidden="true">
      <g fill="currentColor">
        <path d={pathA} opacity={opacity} />
        <path d={b} />
      </g>
    </svg>
  );
}

export default function LongpressReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const phoneRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const fabRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const ringRef = useRef(null) as unknown as Box<SVGCircleElement>;
  const menuRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const actionRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let isPressing = false;
    let pressStart = 0;
    let opened = false;
    let progress = 0;
    let menuT = 0;
    let lastTs = 0, cycleStart = 0;
    let closeTimer: number | undefined;

    const ring = ringRef.current;
    if (ring) ring.style.strokeDasharray = RING_CIRC.toFixed(2);

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function placeActions() {
      const fab = fabRef.current;
      const phone = phoneRef.current;
      if (!fab || !phone) return;
      const fabRect = fab.getBoundingClientRect();
      const phoneRect = phone.getBoundingClientRect();
      const cx = fabRect.left + fabRect.width / 2 - phoneRect.left;
      const cy = fabRect.top + fabRect.height / 2 - phoneRect.top;
      actionRefs.current.forEach((btn, i) => {
        if (!btn) return;
        const rad = (FAN_ANGLES[i] * Math.PI) / 180;
        const x = cx + FAN_R * Math.cos(rad);
        const y = cy + FAN_R * Math.sin(rad);
        btn.style.left = x.toFixed(1) + "px";
        btn.style.top = y.toFixed(1) + "px";
      });
    }

    function openMenu() {
      opened = true;
      placeActions();
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(closeMenu, OPEN_MS);
    }
    function closeMenu() {
      opened = false;
      isPressing = false;
      window.clearTimeout(closeTimer);
    }

    function onFabPointerDown() {
      human();
      if (opened) { closeMenu(); return; }
      isPressing = true;
      pressStart = performance.now();
    }
    function onFabRelease() {
      if (!opened) { isPressing = false; }
    }
    fabRef.current?.addEventListener("pointerdown", onFabPointerDown);
    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
      fabRef.current?.addEventListener(evt, onFabRelease);
    });

    const actionHandlers = actionRefs.current.map(() => () => { human(); closeMenu(); });
    actionRefs.current.forEach((btn, i) => btn?.addEventListener("click", actionHandlers[i]));

    const tabHandlers = tabRefs.current.map((_, i) => () => {
      human();
      tabRefs.current.forEach((o) => o?.classList.remove(styles.isActive));
      tabRefs.current[i]?.classList.add(styles.isActive);
    });
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", tabHandlers[i]));

    function demoPhase(cycleT: number) {
      if (cycleT < HOLD_MS) return { pressing: true, held: cycleT, opened: false };
      if (cycleT < HOLD_MS + OPEN_MS) return { pressing: false, held: HOLD_MS, opened: true };
      return { pressing: false, held: 0, opened: false };
    }

    function tick(ts: number) {
      if (!lastTs) { lastTs = ts; cycleStart = ts; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (isDemo && !reduce) {
        const cycleT = (ts - cycleStart) % CYCLE_MS;
        const phase = demoPhase(cycleT);
        if (phase.pressing) {
          progress = Math.min(1, phase.held / HOLD_MS);
          if (progress >= 1 && !opened) openMenu();
        } else if (phase.opened) {
          if (!opened) openMenu();
          progress = 1;
        } else {
          if (opened) closeMenu();
          progress += (0 - progress) * (1 - Math.exp(-SPRING_RATE * dt));
        }
      } else if (isPressing) {
        const heldMs = ts - pressStart;
        progress = Math.min(1, heldMs / HOLD_MS);
        if (progress >= 1 && !opened) openMenu();
      } else if (opened) {
        progress = 1;
      } else {
        progress += (0 - progress) * (1 - Math.exp(-SPRING_RATE * dt));
      }

      const menuTarget = opened ? 1 : 0;
      menuT += (menuTarget - menuT) * (1 - Math.exp(-MENU_RATE * dt));

      if (ring) ring.style.strokeDashoffset = (RING_CIRC * (1 - progress)).toFixed(2);
      const menu = menuRef.current;
      if (menu) {
        menu.style.opacity = menuT.toFixed(3);
        menu.style.pointerEvents = menuT > 0.5 ? "auto" : "none";
      }
      const menuScale = 0.6 + 0.4 * menuT;
      actionRefs.current.forEach((btn) => {
        if (btn) btn.style.transform = "translate(-50%, -50%) scale(" + menuScale.toFixed(3) + ")";
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    function onResize() { placeActions(); }
    placeActions();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(closeTimer);
      cancelAnimationFrame(rafRef.current);
      fabRef.current?.removeEventListener("pointerdown", onFabPointerDown);
      ["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
        fabRef.current?.removeEventListener(evt, onFabRelease);
      });
      actionRefs.current.forEach((btn, i) => btn?.removeEventListener("click", actionHandlers[i]));
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", tabHandlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone} ref={phoneRef}>
          <div className={styles.menu} ref={menuRef}>
            {ACTIONS.map((a, i) => (
              <button key={a.label} type="button"
                className={styles.action}
                data-i={i}
                aria-label={a.label}
                ref={(el: HTMLButtonElement | null) => { actionRefs.current[i] = el; }}>
                <Icon spec={a.d} />
              </button>
            ))}
          </div>
          <div className={styles.track}>
            <button type="button"
              className={styles.tab + " " + styles.isActive}
              aria-current="true"
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[0] = el; }}>
              <Icon spec={TABS[0].d} cls={styles.icon} />
              <span className={styles.label}>{TABS[0].label}</span>
            </button>
            <button type="button" className={styles.tab} ref={(el: HTMLButtonElement | null) => { tabRefs.current[1] = el; }}>
              <Icon spec={TABS[1].d} cls={styles.icon} />
              <span className={styles.label}>{TABS[1].label}</span>
            </button>
            <button type="button" className={styles.fab} aria-label="빠른메뉴 길게 누르기" ref={fabRef}>
              <svg className={styles.ring} viewBox="0 0 64 64" aria-hidden="true">
                <circle className={styles.ringTrack} cx={32} cy={32} r={RING_R} />
                <circle className={styles.ringProgress} ref={ringRef} cx={32} cy={32} r={RING_R} />
              </svg>
              <svg className={styles.fabIcon} viewBox="0 0 256 256" aria-hidden="true">
                <path fill="currentColor" d="M228 128a12 12 0 0 1-12 12h-76v76a12 12 0 0 1-24 0v-76H40a12 12 0 0 1 0-24h76V40a12 12 0 0 1 24 0v76h76a12 12 0 0 1 12 12" />
              </svg>
            </button>
            <button type="button" className={styles.tab} ref={(el: HTMLButtonElement | null) => { tabRefs.current[2] = el; }}>
              <Icon spec={TABS[2].d} cls={styles.icon} />
              <span className={styles.label}>{TABS[2].label}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
