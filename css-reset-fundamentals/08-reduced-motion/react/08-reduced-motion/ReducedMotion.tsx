// ReducedMotion — vanilla 판(run/376/demo/08-reduced-motion/index.html) 의 React 포트.
// performance.now() 로 transitionend 까지 실제 걸린 ms 를 다시 재 설정값과 나란히 보여준다.
// reduceSim(JS 스위치, 시연 게이트 전용)과 실제 OS/브라우저 prefers-reduced-motion(reduce,
// 자동 루프를 멈추는 데만 쓴다)은 서로 다른 것 — !important 실사용 규칙은 .module.scss 에 있다.
import { useEffect, useRef } from "react";
import styles from "./ReducedMotion.module.scss";

type Box<T> = { current: T };

const BASE_DURATION_MS = 900;
const STEP_MS = 1400;

export default function ReducedMotion() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const dotRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const simBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const playBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const scaleRangeRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const dot = dotRef.current;
    const simBtn = simBtnRef.current;
    const playBtn = playBtnRef.current;
    const scaleRange = scaleRangeRef.current;
    const readout = readoutRef.current;
    if (!wrap || !dot || !simBtn || !playBtn || !scaleRange || !readout) return;

    let isDemo = true;
    let reduceSim = false;
    let runStart = 0;
    let running = false;
    let reducedMotionScale = 0.1;

    function currentDurationMs() {
      return reduceSim ? Math.round(BASE_DURATION_MS * reducedMotionScale) : BASE_DURATION_MS;
    }

    function applyDuration() {
      dot!.style.transitionDuration = currentDurationMs() + "ms";
    }

    function play() {
      if (running) return;
      running = true;
      applyDuration();
      dot!.classList.remove(styles.atEnd);
      void dot!.offsetWidth;
      runStart = performance.now();
      dot!.classList.add(styles.atEnd);
    }

    function onTransitionEnd() {
      const elapsed = Math.round(performance.now() - runStart);
      readout!.textContent =
        "이동 시간 " + elapsed + "ms (설정 " + currentDurationMs() + "ms · 비율 " + reducedMotionScale.toFixed(2) + ")";
      running = false;
    }
    dot.addEventListener("transitionend", onTransitionEnd);

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    function onSimClick() {
      human();
      reduceSim = !reduceSim;
      wrap!.classList.toggle(styles.reduceSim, reduceSim);
      simBtn!.setAttribute("aria-pressed", String(reduceSim));
      applyDuration();
    }
    function onPlayClick() { human(); play(); }
    function onScaleInput() {
      human();
      reducedMotionScale = Number(scaleRange!.value);
      applyDuration();
    }
    simBtn.addEventListener("click", onSimClick);
    playBtn.addEventListener("click", onPlayClick);
    scaleRange.addEventListener("input", onScaleInput);
    scaleRange.addEventListener("pointerdown", human);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        reduceSim = !reduceSim;
        wrap!.classList.toggle(styles.reduceSim, reduceSim);
        simBtn!.setAttribute("aria-pressed", String(reduceSim));
        play();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    applyDuration();
    // 첫 재생은 즉시(느린 900ms 쪽)로 걸어 캡처 구간 안에 이동이 충분히 퍼지게 한다
    play();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      dot!.removeEventListener("transitionend", onTransitionEnd);
      simBtn!.removeEventListener("click", onSimClick);
      playBtn!.removeEventListener("click", onPlayClick);
      scaleRange!.removeEventListener("input", onScaleInput);
      scaleRange!.removeEventListener("pointerdown", human);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.head}>
          <button className={styles.simBtn} ref={simBtnRef} type="button" aria-pressed="false">줄임 모션 시뮬레이션</button>
          <button className={styles.playBtn} ref={playBtnRef} type="button">재생</button>
        </div>
        <div className={styles.track}>
          <div className={styles.dot} ref={dotRef}></div>
        </div>
        <div className={styles.scaleRow}>
          <label className={styles.scaleLabel} htmlFor="scaleRange08">축소 비율</label>
          <input
            className={styles.scaleRange}
            ref={scaleRangeRef}
            id="scaleRange08"
            type="range"
            min={0.02}
            max={0.1}
            step={0.01}
            defaultValue={0.1}
            aria-label="줄임 모션 지속시간 비율"
          />
        </div>
        <div className={styles.readout} ref={readoutRef}>이동 시간 —ms</div>
      </div>
    </main>
  );
}
