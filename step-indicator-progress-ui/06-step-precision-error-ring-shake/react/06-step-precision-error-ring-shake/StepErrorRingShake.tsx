// StepErrorRingShake — vanilla 판(06-step-precision-error-ring-shake) 의 React 포트.
// 값 하나: 오류 발생 시점부터의 경과 tt 에 대해 감쇠 사인 envelope·x오프셋을 매 프레임 계산하고,
// 같은 envelope 로 링 반경을 STEP_ERROR_RING_CONTRACT_PX 만큼 조인다 — 흔들림과 조임이 한 값에서 나온다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepErrorRingShake.module.scss";

type Box<T> = { current: T };

const STEP_ERROR_SHAKE_DECAY = 5.5;
const STEP_ERROR_SHAKE_FREQ = 26;
const STEP_ERROR_SHAKE_AMPLITUDE_PX = 6;
const STEP_ERROR_RING_CONTRACT_PX = 6;
const SHAKE_DURATION_S = 0.6;
const STEP_COUNT = 3;
const RING_BASE_PX = 64;
const NEIGHBOR_SHAKE_RATIO = 0.3; // 인접 노드 미세 흔들림 — 같은 감쇠 함수의 축소판
const LABELS = ["이름", "연락처", "완료"];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function StepErrorRingShake() {
  const [current, setCurrent] = useState(0);
  const [errorIdx, setErrorIdx] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [value, setValue] = useState("");
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const errorAtRef = useRef<number | null>(null) as Box<number | null>;
  const errorIdxRef = useRef<number | null>(null) as Box<number | null>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const ringRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function triggerError(): void {
    errorAtRef.current = performance.now();
    errorIdxRef.current = currentRef.current;
    setErrorIdx(currentRef.current);
    setStatus("이름을 입력해야 다음 단계로 갈 수 있습니다");
  }

  function clearError(): void {
    errorAtRef.current = null;
    errorIdxRef.current = null;
    setErrorIdx(null);
  }

  function advance(currentValue: string): void {
    if (currentRef.current === 0 && currentValue.trim() === "") { triggerError(); return; }
    clearError();
    const next = clamp(currentRef.current + 1, 0, STEP_COUNT - 1);
    currentRef.current = next;
    setCurrent(next);
    setStatus(next === STEP_COUNT - 1 ? "입력 완료" : "");
  }

  function stopDemo(): void { demoRef.current = false; }

  function onInputChange(v: string): void {
    setValue(v);
    if (v.trim() !== "") { clearError(); setStatus(""); }
  }

  useEffect(() => {
    let startTime = 0;
    let phase = 0;
    function clearShakeVisuals(eIdx: number): void {
      const circle = circleRefs.current[eIdx];
      if (circle) circle.style.transform = "";
      const ring = ringRefs.current[eIdx];
      if (ring) ring.style.boxShadow = "none";
      if (glowRef.current) glowRef.current.style.opacity = "0";
      [eIdx - 1, eIdx + 1].forEach((idx) => {
        if (idx >= 0 && idx < STEP_COUNT) {
          const neighbor = circleRefs.current[idx];
          if (neighbor) neighbor.style.transform = "";
        }
      });
    }
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) phase = 0;
        if (phase === 0 && t > 0.20) { triggerError(); phase = 1; }
        if (phase === 1 && t > 1.10) { setValue(""); clearError(); triggerError(); phase = 2; }
      }
      const eIdx = errorIdxRef.current;
      if (!reduce && errorAtRef.current !== null && eIdx !== null) {
        const tt = (now - errorAtRef.current) / 1000;
        const circle = circleRefs.current[eIdx];
        const ring = ringRefs.current[eIdx];
        if (tt <= SHAKE_DURATION_S) {
          const envelope = Math.exp(-STEP_ERROR_SHAKE_DECAY * tt);
          const x = STEP_ERROR_SHAKE_AMPLITUDE_PX * envelope * Math.sin(STEP_ERROR_SHAKE_FREQ * tt);
          if (circle) circle.style.transform = "translateX(" + x.toFixed(2) + "px)";
          const contract = STEP_ERROR_RING_CONTRACT_PX * (1 - envelope);
          const ringSize = RING_BASE_PX - contract;
          if (ring) {
            ring.style.width = ringSize.toFixed(1) + "px";
            ring.style.height = ringSize.toFixed(1) + "px";
            ring.style.marginLeft = (-ringSize / 2).toFixed(1) + "px";
            ring.style.opacity = String(envelope);
            ring.style.boxShadow = "0 0 " + (envelope * 22).toFixed(1) + "px " + (envelope * 8).toFixed(1) + "px rgba(194, 54, 26, " + (envelope * 0.55).toFixed(2) + ")";
          }
          if (glowRef.current) glowRef.current.style.opacity = (envelope * 0.4).toFixed(2);
          [eIdx - 1, eIdx + 1].forEach((idx) => {
            if (idx >= 0 && idx < STEP_COUNT) {
              const neighbor = circleRefs.current[idx];
              if (neighbor) neighbor.style.transform = "translateX(" + (x * NEIGHBOR_SHAKE_RATIO).toFixed(2) + "px)";
            }
          });
        } else {
          clearShakeVisuals(eIdx);
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <main className={styles.stage}>
      <div className={styles.er}>
        <span className={styles.glow} ref={glowRef} aria-hidden="true" />
        <ol className={styles.row} role="list" aria-label="필수 입력 단계">
          {LABELS.map((label, i) => (
            <li key={label} style={{ display: "contents" }}>
              <div className={styles.node}>
                <span className={[styles.ring, errorIdx === i ? styles.ringError : ""].join(" ")} ref={(el: HTMLSpanElement | null) => { ringRefs.current[i] = el; }} />
                <span
                  className={[styles.circle, i === current ? styles.circleActive : "", i < current ? styles.circleDone : "", errorIdx === i ? styles.circleError : ""].join(" ")}
                  ref={(el: HTMLSpanElement | null) => { circleRefs.current[i] = el; }}
                >
                  {i + 1}
                </span>
                <span className={styles.label}>{label}</span>
              </div>
              {i < STEP_COUNT - 1 && <div className={styles.connector} />}
            </li>
          ))}
        </ol>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>이름 (필수)</span>
          <input
            type="text"
            className={styles.input}
            autoComplete="off"
            value={value}
            onChange={(e: { target: { value: string } }) => onInputChange(e.target.value)}
          />
        </label>
        <p className={styles.status} aria-live="assertive">{status}</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={[styles.btn, styles.btnPrimary].join(" ")}
            onClick={() => { stopDemo(); advance(value); }}
          >
            다음
          </button>
        </div>
      </div>
    </main>
  );
}
