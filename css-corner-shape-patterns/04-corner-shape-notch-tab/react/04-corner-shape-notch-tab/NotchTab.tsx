// NotchTab — vanilla 판(run/372/demo/04-corner-shape-notch-tab/index.html) 의 React 포트.
// 탭이 바뀔 때 노치 깊이가 목표값을 살짝 넘겼다가 가라앉는 감쇠 진동(스프링 오버슛)으로 움직인다.
import { useEffect, useRef } from "react";
import styles from "./NotchTab.module.scss";

type Box<T> = { current: T };

const NOTCH_MAX = 14; // 활성 탭이 도달하는 노치 깊이 상한(px)
const SPRING_MS = 560; // 탭이 바뀐 뒤 스프링이 안정되기까지 걸리는 시간
const AUTO_MS = 1700; // 자동 루프에서 탭이 한 칸 넘어가는 간격
const LABELS = ["하나", "둘", "셋"];

export default function NotchTab() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabsRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = useRef([]) as unknown as Box<HTMLButtonElement[]>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "notch");

    const root = rootRef.current;
    const tabsEl = tabsRef.current;
    const tabs = tabRefs.current;
    const readout = readoutRef.current;
    if (!root || !tabsEl || tabs.length === 0 || !readout) return;

    let isDemo = true;
    let active = 0;
    let phaseStart = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 탭이 바뀔 때 노치 깊이가 목표값을 살짝 넘겼다가 가라앉는 감쇠 진동(스프링 오버슛)으로 움직인다
    function springOvershoot(t: number) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    function applyDepth(tab: HTMLButtonElement, depth: number) {
      if (SUPPORTS) (tab.style as any).cornerShape = "notch";
      tab.style.borderRadius = Math.max(0, depth).toFixed(2) + "px";
    }

    function setActive(i: number, ts: number) {
      if (active === i) return;
      tabs[active].setAttribute("aria-selected", "false");
      tabs[active].tabIndex = -1;
      applyDepth(tabs[active], 0);
      active = i;
      tabs[active].setAttribute("aria-selected", "true");
      tabs[active].tabIndex = 0;
      phaseStart = ts;
    }

    const onTabClick = (i: number) => () => { human(); setActive(i, performance.now()); tabs[i].focus({ preventScroll: true }); };
    const clickHandlers = tabs.map((_, i) => onTabClick(i));
    tabs.forEach((tab, i) => tab.addEventListener("click", clickHandlers[i]));

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      human();
      const next = e.key === "ArrowRight" ? (active + 1) % tabs.length : (active + tabs.length - 1) % tabs.length;
      setActive(next, performance.now());
      tabs[next].focus({ preventScroll: true });
    }
    tabsEl.addEventListener("keydown", onKeyDown);

    let start = 0;
    function loop(ts: number) {
      if (!start) { start = ts; phaseStart = ts; }
      if (isDemo && !reduce) {
        const cyclePos = Math.floor((ts - start) / AUTO_MS) % tabs.length;
        if (cyclePos !== active) setActive(cyclePos, ts);
      }
      const elapsed = reduce ? 1 : Math.min(1, (ts - phaseStart) / SPRING_MS);
      const depth = NOTCH_MAX * (reduce ? 1 : springOvershoot(elapsed));
      applyDepth(tabs[active], depth);
      readout!.textContent = "노치 깊이 " + Math.max(0, depth).toFixed(1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      tabs.forEach((tab, i) => tab.removeEventListener("click", clickHandlers[i]));
      tabsEl.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} ref={tabsRef} role="tablist" aria-label="노치 탭 전환">
          {LABELS.map((label, i) => (
            <button
              key={label}
              className={styles.tab}
              ref={(el: HTMLButtonElement | null) => { if (el) tabRefs.current[i] = el; }}
              role="tab"
              aria-selected={i === 0}
              tabIndex={i === 0 ? 0 : -1}
              type="button"
            >{label}</button>
          ))}
        </div>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">노치 깊이 0.0</p>
      </div>
    </main>
  );
}
