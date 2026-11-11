// StepSkipGhostSink — vanilla 판(07-step-precision-skip-ghost-sink) 의 React 포트.
// 값 하나: 건너뛴 노드의 하강 거리·투명도는 easeOutCubic(t) 로 보간한 ratio 를
// STEP_SKIP_SINK_PX·STEP_SKIP_ALPHA_MIN 에 곱한 계산값이다 — 같은 ratio 가 좌우 연결선
// 투명도까지 옮겨져 값 하나가 넓은 면으로 퍼진다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepSkipGhostSink.module.scss";

type Box<T> = { current: T };

const STEP_SKIP_SINK_PX = 16;
const STEP_SKIP_ALPHA_MIN = 0.4;
const STEP_SKIP_TWEEN_MS = 320;
const STEP_COUNT = 4;
const LABELS = ["약관", "프로필", "알림설정", "완료"];
const STATUS_TEXTS = ["1단계: 약관 진행 중", "2단계: 프로필 진행 중", "3단계: 알림설정 진행 중", "4단계: 완료 진행 중"];
const STATUS_ALL_DONE = "모든 단계 완료";
const OPTIONAL_INDEX = 2;
const AURA_MAX_PX = 170;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function StepSkipGhostSink() {
  const [current, setCurrent] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const skippedRef = useRef<boolean>(false) as Box<boolean>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const connectorRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]) as Box<Array<HTMLDivElement | null>>;
  const auraRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintSkip(ratio: number): void {
    const node = circleRefs.current[OPTIONAL_INDEX];
    const small = window.innerWidth < 340;
    const sink = STEP_SKIP_SINK_PX * ratio;
    const alpha = 1 - (1 - STEP_SKIP_ALPHA_MIN) * ratio;
    if (node) {
      node.style.transform = "translateY(" + sink.toFixed(2) + "px)";
      node.style.opacity = alpha.toFixed(3);
      // 계산된 시각 레이어 1: 가라앉음 값 ratio 를 노드 그림자(블러·퍼짐)에 그대로 전파
      const shadowBlur = (small ? 3 : 6) + ratio * (small ? 8 : 22);
      const shadowSpread = ratio * (small ? 1 : 4);
      node.style.boxShadow = ratio > 0.01
        ? "0 " + (2 + sink * 0.4).toFixed(1) + "px " + shadowBlur.toFixed(1) + "px " + shadowSpread.toFixed(1) + "px rgba(0, 0, 0, " + (0.3 * ratio).toFixed(3) + ")"
        : "none";
    }
    // 계산된 시각 레이어 2: 같은 ratio 로 커지고 옅어지는 고스트 아우라(320px 이하에서는 축소해 BD9 유지)
    const aura = auraRef.current;
    if (aura) {
      const auraMax = small ? AURA_MAX_PX * 0.3 : AURA_MAX_PX;
      const auraSize = auraMax * ratio;
      aura.style.width = auraSize.toFixed(1) + "px";
      aura.style.height = auraSize.toFixed(1) + "px";
      aura.style.opacity = (0.5 * ratio).toFixed(3);
    }
    const left = connectorRefs.current[OPTIONAL_INDEX - 1];
    const right = connectorRefs.current[OPTIONAL_INDEX];
    const connOpacity = (1 - 0.35 * ratio).toFixed(3);
    if (left) left.style.opacity = connOpacity;
    if (right) right.style.opacity = connOpacity;
  }

  function applySinkTween(fromRatio: number, toRatio: number): void {
    if (reduce) { paintSkip(toRatio); return; }
    let start = 0;
    function step(now: number): void {
      if (start === 0) start = now;
      const t = clamp((now - start) / STEP_SKIP_TWEEN_MS, 0, 1);
      const r = fromRatio + (toRatio - fromRatio) * easeOutCubic(t);
      paintSkip(r);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function toggleSkip(next: boolean): void {
    if (next === skippedRef.current) return;
    skippedRef.current = next;
    setSkipped(next);
    applySinkTween(next ? 0 : 1, next ? 1 : 0);
  }

  function advance(): void {
    const next = clamp(currentRef.current + 1, 0, STEP_COUNT - 1);
    currentRef.current = next;
    setCurrent(next);
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let startTime = 0;
    let phase = 0;
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2.0;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) { phase = 0; currentRef.current = 0; setCurrent(0); skippedRef.current = false; setSkipped(false); paintSkip(0); }
        if (phase === 0 && t > 0.2) { currentRef.current = OPTIONAL_INDEX; setCurrent(OPTIONAL_INDEX); toggleSkip(true); phase = 1; }
        if (phase === 1 && t > 0.58) { toggleSkip(false); phase = 2; }
        if (phase === 2 && t > 0.96) { toggleSkip(true); phase = 3; }
        if (phase === 3 && t > 1.34) { toggleSkip(false); phase = 4; }
        if (phase === 4 && t > 1.7) { currentRef.current = 0; setCurrent(0); phase = 5; }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); advance(); e.preventDefault(); }
  }

  const statusText = current >= STEP_COUNT - 1 ? STATUS_ALL_DONE : STATUS_TEXTS[current];

  return (
    <main className={styles.stage}>
      <div className={styles.gh} onKeyDown={onKeyDown}>
        <ol className={styles.row} role="list" aria-label="설정 마법사 단계">
          {LABELS.map((label, i) => (
            <li key={label} style={{ display: "contents" }}>
              <div className={styles.node}>
                {i === OPTIONAL_INDEX && <span className={styles.aura} ref={auraRef} />}
                <span
                  className={[styles.circle, i === current ? styles.circleActive : "", i < current ? styles.circleDone : "", i === OPTIONAL_INDEX && skipped ? styles.circleSkipped : ""].join(" ")}
                  ref={(el: HTMLSpanElement | null) => { circleRefs.current[i] = el; }}
                >
                  {i + 1}
                </span>
                <span className={styles.label}>{label}</span>
                {i === OPTIONAL_INDEX && <span className={styles.optional}>선택</span>}
              </div>
              {i < STEP_COUNT - 1 && <div className={styles.connector} ref={(el: HTMLDivElement | null) => { connectorRefs.current[i] = el; }} />}
            </li>
          ))}
        </ol>
        <p className={styles.status} aria-live="polite">{statusText}</p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.btn}
            disabled={current !== OPTIONAL_INDEX || skipped}
            onClick={() => { stopDemo(); toggleSkip(true); advance(); }}
          >
            알림설정 건너뛰기
          </button>
          <button
            type="button"
            className={[styles.btn, styles.btnPrimary].join(" ")}
            disabled={current === STEP_COUNT - 1}
            onClick={() => { stopDemo(); advance(); }}
          >
            다음
          </button>
        </div>
      </div>
    </main>
  );
}
