// ReducedMotionStatic — vanilla 판(run/368/demo/09-custom-checkbox-reduced-motion-static/index.html)
// 의 React 포트. 일반 판은 getTotalLength() 실측 길이를 easeOutCubic 로 rAF 적분해
// strokeDashoffset 을 그리고, 축소 판은 같은 change 로직에서 중간 프레임을 건너뛰고 즉시 점프한다.
import { useEffect, useRef } from "react";
import styles from "./ReducedMotionStatic.module.scss";

type Box<T> = { current: T };

export default function ReducedMotionStatic() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const normalInputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const normalBoxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const normalPathRef = useRef(null) as unknown as Box<SVGPathElement>;
  const reducedInputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const reducedBoxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const DURATION_MS = 460; // 계산 겹 상수: 일반 판에서 체크 선이 그려지는 데 걸리는 실제 시간(ms)
    const CYCLE_MS = 900; // 자동 루프가 두 판을 함께 켜고 끄는 간격
    const systemReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const normalInput = normalInputRef.current;
    const normalBox = normalBoxRef.current;
    const normalPath = normalPathRef.current;
    const reducedInput = reducedInputRef.current;
    const reducedBox = reducedBoxRef.current;
    if (!root || !normalInput || !normalBox || !normalPath || !reducedInput || !reducedBox) return;

    let isDemo = true;
    const LEN = normalPath.getTotalLength();
    normalPath.style.strokeDasharray = String(LEN);
    normalPath.style.strokeDashoffset = String(LEN);

    let drawing = false, drawStart = 0, drawFrom = LEN, drawTo = LEN;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function currentOffset(ts: number) {
      if (!drawing) return drawTo;
      const t = Math.min(1, (ts - drawStart) / DURATION_MS);
      return drawFrom + (drawTo - drawFrom) * easeOutCubic(t);
    }

    function setState(next: boolean, ts: number) {
      // 일반 판: DURATION_MS 동안 draw-on 을 실측 길이 기준으로 보간(matchMedia 가 false 일 때의 실제 경로)
      normalInput!.checked = next;
      normalBox!.classList.toggle(styles.boxOn, next);
      drawFrom = currentOffset(ts);
      drawTo = next ? 0 : LEN;
      drawStart = ts;
      drawing = true;

      // 축소 판: matchMedia 결과와 같은 논리 분기로, 중간 프레임 없이 즉시 목표 상태로 점프
      reducedInput!.checked = next;
      reducedBox!.classList.toggle(styles.boxOn, next);
    }

    function onNormalChange() { human(); setState(normalInput!.checked, performance.now()); }
    normalInput.addEventListener("change", onNormalChange);

    function onReducedChange() {
      human();
      reducedBox!.classList.toggle(styles.boxOn, reducedInput!.checked);
      normalInput!.checked = reducedInput!.checked;
      normalBox!.classList.toggle(styles.boxOn, reducedInput!.checked);
      normalPath!.style.strokeDashoffset = reducedInput!.checked ? "0" : String(LEN);
      drawTo = reducedInput!.checked ? 0 : LEN;
      drawing = false;
    }
    reducedInput.addEventListener("change", onReducedChange);

    let cycleStart = 0;
    let lastState = false;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo && !systemReduce) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) { lastState = step; setState(step, ts); }
      }

      if (drawing) {
        const off = currentOffset(ts);
        normalPath!.style.strokeDashoffset = String(off);
        if (Math.abs(off - drawTo) < 0.05) drawing = false;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // 일반 판의 draw-on 계산(DURATION_MS)은 matchMedia 값과 무관하게 항상 그대로 수행한다 —
    // 실제 OS/브라우저가 reduce 라면 위 자동 루프 자체가 멈춰(강제 모션 없음) 데모가 클릭을
    // 기다리고, 클릭 시에는 여전히 두 판의 차이(그리기 vs 즉시 점프)가 그대로 보인다.
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      normalInput.removeEventListener("change", onNormalChange);
      reducedInput.removeEventListener("change", onReducedChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cbr + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.cbrPanel}>
          <p className={styles.cbrLabel}>일반</p>
          <label className={styles.cbrRow}>
            <input type="checkbox" className={styles.cbrInput} ref={normalInputRef} />
            <span className={styles.cbrBox} ref={normalBoxRef} aria-hidden="true">
              <svg viewBox="0 0 20 20" width={14} height={14}>
                <path ref={normalPathRef} className={styles.cbrPath} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={styles.cbrText}>뉴스레터 수신</span>
          </label>
        </div>
        <div className={styles.cbrPanel}>
          <p className={styles.cbrLabel}>축소</p>
          <label className={styles.cbrRow}>
            <input type="checkbox" className={styles.cbrInput} ref={reducedInputRef} />
            <span className={styles.cbrBox + " " + styles.boxInstant} ref={reducedBoxRef} aria-hidden="true">
              <svg viewBox="0 0 20 20" width={14} height={14}>
                <path className={styles.cbrCheck} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={styles.cbrText}>뉴스레터 수신</span>
          </label>
        </div>
      </div>
    </main>
  );
}
