// SwipeFollow — vanilla 판(run/367/demo/07-bottom-nav-bar-swipe-follow/index.html) 의 React 포트.
// 드래그 중엔 포인터 x 를 그대로 clamp 해 인디케이터가 1:1 로 따라오고, 놓으면 가장 가까운
// 탭의 실측 rect(getBoundingClientRect) 로 스프링(SPRING_K·C) 정착한다.
import { useEffect, useRef } from "react";
import styles from "./SwipeFollow.module.scss";

type Box<T> = { current: T };
type Geo = { left: number; width: number; height: number };

const SPRING_K = 240; // 계산 겹: 정착(settle) 스프링 상수 — 드래그를 놓은 뒤 가장 가까운 탭으로 당긴다
const SPRING_C = 20; // 감쇠 상수
const DRAG_MS = 520; // 자동 루프에서 가상 손가락이 다음 탭까지 이동하는 시간
const WAIT_MS = 700; // 정착 뒤 머무는 시간

const TABS = [
  { label: "홈", d: "M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120|.2#m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z" },
  { label: "쇼핑", d: "M224 80v120a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8|.2#M216 64h-40a48 48 0 0 0-96 0H40a16 16 0 0 0-16 16v120a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-88-32a32 32 0 0 1 32 32H96a32 32 0 0 1 32-32m88 168H40V80h176Z" },
  { label: "알림", d: "M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12|.2#M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" },
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

export default function SwipeFollow() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const indicatorRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    const tabs = tabRefs.current;
    if (!track || !indicator) return;

    let isDemo = true;
    let geo: Geo[] = [];
    let maxX = 0, indW = 0, indH = 0;
    let activeIdx = 0;
    let posX = 0;
    let vel = 0;
    let settling = false;
    let settleTarget = 0;
    let dragging = false;
    let dragStartClientX = 0;
    let dragStartX = 0;
    let lastTs = 0;

    function measure() {
      const trackRect = track!.getBoundingClientRect();
      geo = tabs.map((t) => {
        const r = t!.getBoundingClientRect();
        return { left: r.left - trackRect.left, width: r.width, height: r.height };
      });
      const first = geo[0];
      indW = first.width; indH = first.height;
      indicator!.style.width = indW + "px";
      indicator!.style.height = indH + "px";
      maxX = geo[geo.length - 1].left;
      posX = geo[activeIdx].left;
      indicator!.style.transform = "translateX(" + posX.toFixed(1) + "px)";
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function nearestIndex(centerX: number) {
      let best = 0, bestDist = Infinity;
      geo.forEach((g, i) => {
        const c = g.left + g.width / 2;
        const d = Math.abs(c - centerX);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function setActive(idx: number) {
      activeIdx = idx;
      tabs.forEach((t, i) => t?.classList.toggle(styles.isActive, i === idx));
    }

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      settling = false;
      dragStartClientX = e.clientX;
      dragStartX = posX;
      if (e.pointerId != null) {
        try { track!.setPointerCapture(e.pointerId); } catch { /* noop */ }
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - dragStartClientX;
      posX = Math.max(0, Math.min(maxX, dragStartX + dx));
      indicator!.style.transform = "translateX(" + posX.toFixed(1) + "px)";
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      const idx = nearestIndex(posX + indW / 2);
      setActive(idx);
      settling = true;
      settleTarget = geo[idx].left;
      vel = 0;
    }

    track.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    const tabHandlers = tabs.map((_, i) => () => {
      human();
      if (dragging) return;
      setActive(i);
      settling = true;
      settleTarget = geo[i].left;
      vel = 0;
    });
    tabs.forEach((t, i) => t?.addEventListener("click", tabHandlers[i]));

    const demoOrder = [2, 1, 3, 0]; // 자동 루프가 방문할 탭 순서
    let demoStep = 0;
    let demoPhase: "drag" | "settle" | "wait" = "wait";
    let demoElapsed = 0;
    let demoFromIdx = 0;

    function tick(ts: number) {
      if (!lastTs) { lastTs = ts; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (isDemo && !reduce && !dragging) {
        demoElapsed += dt * 1000;
        if (demoPhase === "drag") {
          const t = Math.min(1, demoElapsed / DRAG_MS);
          const toIdx = demoOrder[demoStep];
          const fromCenter = geo[demoFromIdx].left + indW / 2;
          const toCenter = geo[toIdx].left + indW / 2;
          const virtualCenter = fromCenter + (toCenter - fromCenter) * t;
          posX = Math.max(0, Math.min(maxX, virtualCenter - indW / 2));
          indicator!.style.transform = "translateX(" + posX.toFixed(1) + "px)";
          if (t >= 1) {
            setActive(toIdx);
            settling = true; settleTarget = geo[toIdx].left; vel = 0;
            demoPhase = "settle"; demoElapsed = 0;
          }
        } else if (demoPhase === "settle") {
          if (!settling) { demoPhase = "wait"; demoElapsed = 0; }
        } else if (demoPhase === "wait") {
          if (demoElapsed >= WAIT_MS) {
            demoFromIdx = demoOrder[demoStep];
            demoStep = (demoStep + 1) % demoOrder.length;
            demoPhase = "drag"; demoElapsed = 0;
          }
        }
      }

      if (settling) {
        const acc = (settleTarget - posX) * SPRING_K - vel * SPRING_C;
        vel += acc * dt;
        posX += vel * dt;
        if (Math.abs(settleTarget - posX) < 0.4 && Math.abs(vel) < 4) {
          posX = settleTarget; vel = 0; settling = false;
        }
        indicator!.style.transform = "translateX(" + posX.toFixed(1) + "px)";
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function onResize() { measure(); }
    measure();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      track.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      tabs.forEach((t, i) => t?.removeEventListener("click", tabHandlers[i]));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.phone}>
          <div className={styles.track} ref={trackRef}>
            <div className={styles.indicator} ref={indicatorRef} />
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
