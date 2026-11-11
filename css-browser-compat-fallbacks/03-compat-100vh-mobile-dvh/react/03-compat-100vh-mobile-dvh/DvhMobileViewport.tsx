// DvhMobileViewport — vanilla 판(run/375/demo/03-compat-100vh-mobile-dvh/index.html) 의 React 포트.
// 100vh 고정판은 주소창이 접히고 펼쳐져도 재계산하지 않는 버그를 그대로 보여주고, 동적 뷰포트판은
// VH_RECALC_DEBOUNCE_MS 뒤에 --bar-h 를 다시 놓는다.
import { useEffect, useRef } from "react";
import styles from "./DvhMobileViewport.module.scss";

type Box<T> = { current: T };

const VH_RECALC_DEBOUNCE_MS = 150; // 주소창이 움직인 뒤 높이를 다시 계산하기까지의 지연 — 변형 목표: 150 → 50
const BAR_OPEN_PX = 34; // 주소창이 펼쳐졌을 때 화면에서 차지하는 높이
const STEP_MS = 780;

export default function DvhMobileViewport() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const addrToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const screenDvhRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const anchorDvhRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const addrToggle = addrToggleRef.current;
    const screenDvh = screenDvhRef.current;
    const anchorDvh = anchorDvhRef.current;
    if (!wrap || !addrToggle || !screenDvh || !anchorDvh) return;

    let isDemo = true;
    let collapsed = false;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    function recalc() {
      const barH = collapsed ? 0 : BAR_OPEN_PX;
      screenDvh!.style.setProperty("--bar-h", barH + "px");
      anchorDvh!.classList.add(styles.isSettled);
    }
    function scheduleRecalc() {
      anchorDvh!.classList.remove(styles.isSettled);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(recalc, VH_RECALC_DEBOUNCE_MS);
    }
    function setCollapsed(on: boolean) {
      collapsed = on;
      wrap!.classList.toggle(styles.isCollapsed, on);
      addrToggle!.textContent = on ? "주소창 펼치기" : "주소창 접기";
      addrToggle!.setAttribute("aria-pressed", String(on));
      scheduleRecalc();
    }
    function onClick() { human(); setCollapsed(!collapsed); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") human(); }
    addrToggle.addEventListener("click", onClick);
    addrToggle.addEventListener("keydown", onKeyDown);

    recalc();

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        setCollapsed(!collapsed);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      addrToggle!.removeEventListener("click", onClick);
      addrToggle!.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button className={styles.addrToggle} ref={addrToggleRef} type="button" aria-pressed="false">주소창 접기</button>
        <div className={styles.phones}>
          <div className={styles.phone}>
            <span className={styles.phoneLabel}>100vh 고정판</span>
            <div className={styles.screen}>
              <div className={styles.addressBar}></div>
              <button className={styles.anchor + " " + styles.isFixed} type="button">계속하기</button>
            </div>
          </div>
          <div className={styles.phone}>
            <span className={styles.phoneLabel}>동적 뷰포트판</span>
            <div className={styles.screen} ref={screenDvhRef}>
              <div className={styles.addressBar}></div>
              <button className={styles.anchor + " " + styles.isDvh} ref={anchorDvhRef} type="button">계속하기</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
