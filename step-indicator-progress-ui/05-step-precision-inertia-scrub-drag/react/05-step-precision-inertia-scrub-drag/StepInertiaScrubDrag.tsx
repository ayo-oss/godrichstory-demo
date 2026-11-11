// StepInertiaScrubDrag — vanilla 판(05-step-precision-inertia-scrub-drag) 의 React 포트.
// 값 하나: 손을 놓는 순간의 속도(vel)가 STEP_SCRUB_INERTIA_FRICTION 만큼 매 프레임 감쇠되며
// coastStep() 이 관성으로 더 미끄러지다가, 문턱 아래로 떨어지면 easeOutCubic settle 이 이어받아
// 가장 가까운 단계로 스냅한다 — 관성과 스냅 둘 다 계산.
import { useEffect, useRef, useState } from "react";
import styles from "./StepInertiaScrubDrag.module.scss";

type Box<T> = { current: T };
type Settler = ((now: number) => void) | null;

const STEP_SCRUB_INERTIA_FRICTION = 0.85;
const STEP_COUNT = 5;
const VEL_EPS = 0.05;
const SETTLE_MS = 260;
const SIM_KICK = 92;
const TRAIL_VEL_REF = 0.12; // 표시 레이어 정규화 기준(로직 무관)
const TRAIL_LAG = 5;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function nearestStep(p: number): number {
  return Math.round(p * (STEP_COUNT - 1)) / (STEP_COUNT - 1);
}

export default function StepInertiaScrubDrag() {
  const [stepIndex, setStepIndex] = useState(0);
  const [reduce, setReduce] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const trailRef = useRef<HTMLSpanElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const posRef = useRef<number>(0) as Box<number>;
  const velRef = useRef<number>(0) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const settlingRef = useRef<Settler>(null) as Box<Settler>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function trackWidth(): number {
    const track = trackRef.current;
    const handle = handleRef.current;
    if (!track || !handle) return 1;
    return Math.max(1, track.clientWidth - handle.clientWidth);
  }

  function render(): void {
    const w = trackWidth();
    const px = posRef.current * w;
    if (handleRef.current) {
      handleRef.current.style.transform = "translateX(" + px.toFixed(1) + "px)";
      handleRef.current.setAttribute("aria-valuenow", String(Math.round(posRef.current * (STEP_COUNT - 1))));
    }
    if (fillRef.current) {
      fillRef.current.style.width = (posRef.current * 100).toFixed(2) + "%";
      const intensity = clamp(Math.abs(velRef.current) / TRAIL_VEL_REF, 0, 1);
      fillRef.current.style.boxShadow = intensity > 0.02
        ? "0 0 " + (8 + intensity * 30).toFixed(1) + "px rgba(91, 140, 248, " + (0.3 + intensity * 0.6).toFixed(2) + ")"
        : "none";
      if (trailRef.current) {
        const trailPx = clamp(px - velRef.current * w * TRAIL_LAG, 0, w);
        trailRef.current.style.transform = "translateX(" + trailPx.toFixed(1) + "px) scale(" + (1 + intensity * 1.1).toFixed(2) + ")";
        trailRef.current.style.opacity = (intensity * 0.85).toFixed(2);
      }
    }
    setStepIndex(Math.round(posRef.current * (STEP_COUNT - 1)));
  }

  function startSettle(target: number): void {
    const from = posRef.current;
    let start = 0;
    settlingRef.current = (now: number) => {
      if (start === 0) start = now;
      const t = clamp((now - start) / SETTLE_MS, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      posRef.current = from + (target - from) * eased;
      render();
      if (t >= 1) { settlingRef.current = null; posRef.current = target; render(); }
    };
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    function onPointerDown(e: PointerEvent): void {
      draggingRef.current = true;
      velRef.current = 0;
      settlingRef.current = null;
      stopDemo();
      lastXRef.current = e.clientX;
      handle?.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent): void {
      if (!draggingRef.current) return;
      const w = trackWidth();
      const deltaRatio = (e.clientX - lastXRef.current) / w;
      lastXRef.current = e.clientX;
      velRef.current = deltaRatio;
      posRef.current = clamp(posRef.current + deltaRatio, 0, 1);
      render();
    }
    function endDrag(): void { draggingRef.current = false; }
    function onKeyDown(e: KeyboardEvent): void {
      const step = 1 / (STEP_COUNT - 1);
      if (e.key === "ArrowRight") { stopDemo(); settlingRef.current = null; posRef.current = clamp(nearestStep(posRef.current) + step, 0, 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { stopDemo(); settlingRef.current = null; posRef.current = clamp(nearestStep(posRef.current) - step, 0, 1); render(); e.preventDefault(); }
    }
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    handle.addEventListener("keydown", onKeyDown);
    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", endDrag);
      handle.removeEventListener("pointercancel", endDrag);
      handle.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function coastStep(): void {
    if (Math.abs(velRef.current) <= VEL_EPS) {
      velRef.current = 0;
      if (!settlingRef.current) startSettle(nearestStep(posRef.current));
      return;
    }
    velRef.current = velRef.current * STEP_SCRUB_INERTIA_FRICTION;
    posRef.current = clamp(posRef.current + velRef.current, 0, 1);
    render();
  }

  useEffect(() => {
    let startTime = 0;
    const kickSchedule = [0.20, 0.70, 1.20, 1.70];
    let kickIdx = -1;
    let kickSign = 1;
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2;
      if (demoRef.current && !draggingRef.current) {
        if (t < kickSchedule[0] && kickIdx !== -1) kickIdx = -1;
        for (let i = 0; i < kickSchedule.length; i++) {
          if (t >= kickSchedule[i] && kickIdx < i) {
            velRef.current = (SIM_KICK / trackWidth()) * kickSign;
            kickSign = -kickSign;
            settlingRef.current = null;
            kickIdx = i;
          }
        }
      }
      if (reduce) {
        if (!draggingRef.current) { posRef.current = nearestStep(posRef.current); render(); }
      } else if (!draggingRef.current) {
        if (velRef.current !== 0) coastStep();
        else if (settlingRef.current) settlingRef.current(now);
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    render();
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <main className={styles.stage}>
      <div className={styles.sc}>
        <div className={styles.track} ref={trackRef}>
          <span className={styles.fill} ref={fillRef} />
          <span className={styles.tick} style={{ left: "0%" }} />
          <span className={styles.tick} style={{ left: "25%" }} />
          <span className={styles.tick} style={{ left: "50%" }} />
          <span className={styles.tick} style={{ left: "75%" }} />
          <span className={styles.tick} style={{ left: "100%" }} />
          <span className={styles.trail} ref={trailRef} aria-hidden="true" />
          <button
            type="button"
            className={styles.handle}
            ref={handleRef}
            role="slider"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={STEP_COUNT - 1}
            aria-valuenow={stepIndex}
            aria-label="튜토리얼 단계"
          />
        </div>
        <p className={styles.status} aria-live="polite">{(stepIndex + 1) + " / " + STEP_COUNT + " 단계"}</p>
      </div>
    </main>
  );
}
