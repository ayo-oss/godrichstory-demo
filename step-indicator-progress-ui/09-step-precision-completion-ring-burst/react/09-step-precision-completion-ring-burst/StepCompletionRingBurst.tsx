// StepCompletionRingBurst — vanilla 판(09-step-precision-completion-ring-burst) 의 React 포트.
// 값 하나: 링마다 반경 = BASE_RADIUS_PX + STEP_BURST_SPEED_PX_S × 경과시간, 알파 = 1 - 경과/DURATION 을
// 매 프레임 계산해 그린다. STEP_BURST_STAGGER_S 만큼 어긋난 시작 시각으로 세 겹이 순서대로 번진다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepCompletionRingBurst.module.scss";

type Box<T> = { current: T };

const STEP_BURST_RING_COUNT = 3;
const STEP_BURST_SPEED_PX_S = 85;
const STEP_BURST_DURATION_S = 0.78;
const STEP_BURST_STAGGER_S = 0.14;
const BASE_RADIUS_PX = 17;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function StepCompletionRingBurst() {
  const [completed, setCompleted] = useState(false);
  const [status, setStatus] = useState("결제를 완료해 주세요");
  const [reduce, setReduce] = useState(false);
  const completedRef = useRef<boolean>(false) as Box<boolean>;
  const burstAtRef = useRef<number | null>(null) as Box<number | null>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const ringRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const cardGlowRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const finalCircleRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function finish(): void {
    completedRef.current = true;
    burstAtRef.current = performance.now();
    setCompleted(true);
    setStatus("결제가 완료되었습니다");
    if (reduce) {
      ringRefs.current.forEach((el) => { if (el) el.style.opacity = "0"; });
      if (cardGlowRef.current) cardGlowRef.current.style.opacity = "0";
    }
  }

  function reset(): void {
    completedRef.current = false;
    burstAtRef.current = null;
    setCompleted(false);
    setStatus("결제를 완료해 주세요");
    ringRefs.current.forEach((el) => { if (el) el.style.opacity = "0"; });
    if (cardGlowRef.current) { cardGlowRef.current.style.width = "0px"; cardGlowRef.current.style.height = "0px"; cardGlowRef.current.style.opacity = "0"; }
    if (finalCircleRef.current) finalCircleRef.current.style.boxShadow = "none";
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let startTime = 0;
    let phase = 0;
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2.0;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) { phase = 0; reset(); }
        if (phase === 0 && t > 0.22) { finish(); phase = 1; }
        if (phase === 1 && t > 1.05) { reset(); phase = 2; }
        if (phase === 2 && t > 1.15) { finish(); phase = 3; }
      }
      if (!reduce && burstAtRef.current !== null) {
        const small = window.innerWidth < 340;
        const scale = small ? 0.42 : 1;
        const elapsed = (now - burstAtRef.current) / 1000;
        let anyAlive = false;
        let primaryRatio = 0;
        ringRefs.current.forEach((el, idx) => {
          if (!el) return;
          const tt = elapsed - idx * STEP_BURST_STAGGER_S;
          if (tt < 0) { el.style.opacity = "0"; anyAlive = true; return; }
          if (tt > STEP_BURST_DURATION_S) { el.style.opacity = "0"; return; }
          anyAlive = true;
          const radius = (BASE_RADIUS_PX + STEP_BURST_SPEED_PX_S * tt) * scale;
          const alpha = 1 - tt / STEP_BURST_DURATION_S;
          const d = radius * 2;
          el.style.width = d.toFixed(1) + "px";
          el.style.height = d.toFixed(1) + "px";
          el.style.marginLeft = (-radius).toFixed(1) + "px";
          el.style.marginTop = (-radius).toFixed(1) + "px";
          el.style.opacity = alpha.toFixed(3);
          // 계산된 시각 레이어: 첫 링(지연 없음)의 반경 진행률·알파를 카드 배경 톤·노드 글로우로 같은 함수로 전파
          if (idx === 0) primaryRatio = alpha * clamp(tt / STEP_BURST_DURATION_S, 0, 1);
        });
        if (primaryRatio > 0) {
          const glowMax = (small ? 90 : 220) * primaryRatio;
          if (cardGlowRef.current) {
            cardGlowRef.current.style.width = glowMax.toFixed(1) + "px";
            cardGlowRef.current.style.height = glowMax.toFixed(1) + "px";
            cardGlowRef.current.style.opacity = (0.4 * primaryRatio).toFixed(3);
          }
          if (finalCircleRef.current) {
            finalCircleRef.current.style.boxShadow = "0 0 " + (8 + primaryRatio * 26).toFixed(1) + "px rgba(120, 224, 173, " + (0.55 * primaryRatio).toFixed(3) + ")";
          }
        }
        if (!anyAlive) burstAtRef.current = null;
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <main className={styles.stage}>
      <div className={styles.cb}>
        <ol className={styles.row} role="list" aria-label="결제 완료 단계">
          <li className={styles.node}>
            <span className={[styles.circle, styles.circleDone].join(" ")}>1</span>
            <span className={styles.label}>주문</span>
          </li>
          <li className={[styles.connector, styles.connectorDone].join(" ")} />
          <li className={styles.node}>
            <span className={[styles.circle, styles.circleDone].join(" ")}>2</span>
            <span className={styles.label}>결제</span>
          </li>
          <li className={[styles.connector, styles.connectorDone].join(" ")} />
          <li className={styles.node}>
            <span className={styles.cardGlow} ref={cardGlowRef} />
            <span className={styles.burstLayer}>
              {[0, 1, 2].map((i) => (
                <span className={styles.ring} key={i} ref={(el: HTMLSpanElement | null) => { ringRefs.current[i] = el; }} />
              ))}
            </span>
            <span
              className={[styles.circle, completed ? styles.circleDone : ""].join(" ")}
              ref={finalCircleRef}
            >
              3
            </span>
            <span className={styles.label}>완료</span>
          </li>
        </ol>
        <p className={styles.status} aria-live="polite">{status}</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={[styles.btn, styles.btnPrimary].join(" ")}
            onClick={() => { stopDemo(); if (!completedRef.current) finish(); }}
          >
            결제 완료
          </button>
        </div>
      </div>
    </main>
  );
}
