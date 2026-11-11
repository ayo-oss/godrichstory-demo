// DisabledDimLock — vanilla 판(run/368/demo/08-custom-checkbox-disabled-dim-lock/index.html) 의
// React 포트. 자물쇠 걸쇠(shackle)의 회전각을 고정 축 기준으로 easeOutCubic 적분해 rotate() 값을
// 만든다 — 잠금 해제 버튼을 누르면 몸통은 그대로, 걸쇠만 계산된 각도로 열린다.
import { useEffect, useRef } from "react";
import styles from "./DisabledDimLock.module.scss";

type Box<T> = { current: T };

export default function DisabledDimLock() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rowRef = useRef(null) as unknown as Box<HTMLLabelElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const toggleTextRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const shackleRef = useRef(null) as unknown as Box<SVGPathElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    let LOCK_MS = 360; // 계산 겹 상수: 걸쇠가 열리는 회전이 끝나는 데 걸리는 실제 시간(ms)
    const UNLOCK_ANGLE = -42; // deg, 걸쇠가 열릴 때 돌아가는 최대 각도
    const SHACKLE_PIVOT_X = 8, SHACKLE_PIVOT_Y = 11; // svg 좌표계 안의 회전 축(걸쇠 아래쪽 끝)
    const CYCLE_MS = 1300;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const row = rowRef.current;
    const input = inputRef.current;
    const toggle = toggleRef.current;
    const toggleText = toggleTextRef.current;
    const shackle = shackleRef.current;
    if (!root || !row || !input || !toggle || !toggleText || !shackle) return;

    let isDemo = true;
    let locked = true;
    let animating = false, animStart = 0, angleFrom = 0, angleTo = 0;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function currentAngle(ts: number) {
      if (!animating) return angleTo;
      const t = Math.min(1, (ts - animStart) / LOCK_MS);
      return angleFrom + (angleTo - angleFrom) * easeOutCubic(t);
    }

    function apply(nextLocked: boolean, ts: number) {
      locked = nextLocked;
      input!.disabled = locked;
      row!.classList.toggle(styles.rowLocked, locked);
      toggle!.setAttribute("aria-pressed", String(locked));
      toggleText!.textContent = locked ? "잠금 해제" : "잠금";
      angleFrom = currentAngle(ts);
      angleTo = locked ? 0 : UNLOCK_ANGLE;
      animStart = ts;
      animating = true;
    }

    function onToggleClick() { human(); apply(!locked, performance.now()); }
    toggle.addEventListener("click", onToggleClick);

    let cycleStart = 0;
    let lastState = true;

    function loop(ts: number) {
      if (!cycleStart) { cycleStart = ts; apply(true, ts); }

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) { lastState = step; apply(!step, ts); }
      }

      const angle = currentAngle(ts);
      // 계산 겹: 걸쇠 회전을 고정 축(SHACKLE_PIVOT_X, Y) 기준으로 계산해 자물쇠 몸통은 그대로,
      // 걸쇠만 열리는 자연스러운 회전을 만든다
      shackle!.style.transform = "rotate(" + angle.toFixed(2) + "deg)";
      shackle!.style.transformOrigin = SHACKLE_PIVOT_X + "px " + SHACKLE_PIVOT_Y + "px";
      if (animating && Math.abs(angle - angleTo) < 0.01) animating = false;

      rafRef.current = requestAnimationFrame(loop);
    }

    if (reduce) { LOCK_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      toggle.removeEventListener("click", onToggleClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cbl + " " + styles.isDemo} ref={rootRef}>
        <label className={styles.cblRow} ref={rowRef}>
          <input type="checkbox" className={styles.cblInput} ref={inputRef} disabled defaultChecked />
          <span className={styles.cblBox} aria-hidden="true">
            <svg viewBox="0 0 20 20" width={14} height={14}>
              <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.cblText}>관리자 전용 설정</span>
        </label>
        <button type="button" className={styles.cblToggle} ref={toggleRef} aria-pressed="true">
          <svg className={styles.cblLock} viewBox="0 0 24 24" width={16} height={16}>
            <rect x={5} y={11} width={14} height={10} rx={2} fill="currentColor" />
            <path ref={shackleRef} className={styles.cblShackle} d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
          </svg>
          <span ref={toggleTextRef}>잠금 해제</span>
        </button>
      </div>
    </main>
  );
}
