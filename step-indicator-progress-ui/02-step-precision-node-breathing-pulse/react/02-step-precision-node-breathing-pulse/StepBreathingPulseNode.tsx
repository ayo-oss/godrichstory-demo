// StepBreathingPulseNode — vanilla 판(02-step-precision-node-breathing-pulse) 의 React 포트.
// 값 하나: 활성 원의 확대 비율 = 1 + AMPLITUDE·exp(-DECAY·t)·sin(FREQ·t) — 감쇠 사인을 매 프레임 계산.
// 같은 감쇠값(envelope)을 링의 opacity·scale 에도 옮겨 값 하나가 두 시각 요소로 퍼진다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepBreathingPulseNode.module.scss";

type Box<T> = { current: T };

const STEP_BREATH_DECAY = 2.4;
const STEP_BREATH_FREQ = 9.5;
const STEP_BREATH_AMPLITUDE = 0.16;
const STEP_COUNT = 3;
const LABELS = ["배송지", "결제", "확인"];
const STATUS_TEXTS = ["진행 중: 배송지 (1/3)", "진행 중: 결제 (2/3)", "진행 중: 확인 (3/3)"];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function StepBreathingPulseNode() {
  const [current, setCurrent] = useState(0);
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const impulseAtRef = useRef<number>(0) as Box<number>;
  const circleRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null]) as Box<Array<HTMLButtonElement | null>>;
  const ringRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function goTo(next: number): void {
    const clamped = clamp(next, 0, STEP_COUNT - 1);
    if (clamped === currentRef.current) return;
    currentRef.current = clamped;
    impulseAtRef.current = performance.now();
    setCurrent(clamped);
  }

  function stopDemo(): void { demoRef.current = false; }

  function breathScale(nowMs: number): number {
    const tt = (nowMs - impulseAtRef.current) / 1000;
    if (tt < 0) return 1;
    const envelope = Math.exp(-STEP_BREATH_DECAY * tt);
    return 1 + STEP_BREATH_AMPLITUDE * envelope * Math.sin(STEP_BREATH_FREQ * tt);
  }

  useEffect(() => {
    let startTime = 0;
    let phase = 0;
    function tick(now: number): void {
      if (startTime === 0) { startTime = now; impulseAtRef.current = now; }
      if (demoRef.current) {
        const t = ((now - startTime) / 1000) % 2;
        if (t < 0.05 && phase !== 0) phase = 0;
        if (phase === 0 && t > 0.2) { goTo((currentRef.current + 1) % STEP_COUNT); phase = 1; }
        if (phase === 1 && t > 0.85) { goTo((currentRef.current + 1) % STEP_COUNT); phase = 2; }
        if (phase === 2 && t > 1.5) { goTo((currentRef.current + 1) % STEP_COUNT); phase = 3; }
      }
      const idx = currentRef.current;
      const circle = circleRefs.current[idx];
      const ring = ringRefs.current[idx];
      const tt = (now - impulseAtRef.current) / 1000;
      const envelope = tt < 0 ? 0 : Math.max(0, Math.exp(-STEP_BREATH_DECAY * tt));
      if (rootRef.current) rootRef.current.style.setProperty("--breathGlow", envelope.toFixed(3));
      if (!reduce) {
        if (circle) {
          circle.style.transform = "scale(" + breathScale(now).toFixed(4) + ")";
          circle.style.setProperty("--breathGlow", envelope.toFixed(3));
        }
        if (ring) {
          ring.style.opacity = (envelope * 0.5).toFixed(3);
          ring.style.transform = "scale(" + (1 + (1 - envelope) * 0.6).toFixed(3) + ")";
        }
      } else if (circle) {
        circle.style.transform = "scale(1)";
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); goTo(current + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopDemo(); goTo(current - 1); e.preventDefault(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.bp} onKeyDown={onKeyDown} ref={(el: HTMLDivElement | null) => { rootRef.current = el; }}>
        <ol className={styles.row} role="list" aria-label="체크아웃 진행 단계">
          {LABELS.map((label, i) => (
            <li key={label} style={{ display: "contents" }}>
              <div className={styles.node}>
                <span className={[styles.ring, i === current ? styles.ringActive : ""].join(" ")} ref={(el: HTMLSpanElement | null) => { ringRefs.current[i] = el; }} />
                <button
                  type="button"
                  className={[styles.circle, i === current ? styles.circleActive : "", i < current ? styles.circleDone : ""].join(" ")}
                  ref={(el: HTMLButtonElement | null) => { circleRefs.current[i] = el; }}
                  onClick={() => { stopDemo(); goTo(i); }}
                >
                  {i + 1}
                </button>
                <span className={styles.label}>{label}</span>
              </div>
              {i < STEP_COUNT - 1 && <div className={styles.connector} />}
            </li>
          ))}
        </ol>
        <p className={styles.status} aria-live="polite">{STATUS_TEXTS[current]}</p>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} disabled={current === 0} onClick={() => { stopDemo(); goTo(current - 1); }}>이전</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={current === STEP_COUNT - 1} onClick={() => { stopDemo(); goTo(current + 1); }}>다음</button>
        </div>
      </div>
    </main>
  );
}
