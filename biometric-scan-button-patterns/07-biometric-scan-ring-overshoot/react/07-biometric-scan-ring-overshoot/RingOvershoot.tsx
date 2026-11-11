// RingOvershoot — vanilla 판(run/371/demo/07-biometric-scan-ring-overshoot/index.html) 의 React 포트.
// 계산 겹(관성 오버슛)은 useEffect 안에 있다: 목표 일치율을 스프링 물리(힘·속도·위치)로 매 프레임
// 직접 적분한다 — 트윈 이징이 아니라 관성 때문에 목표를 넘었다가 되돌아와 멈춘다.
// 자동 루프는 목표값을 정착 시간보다 짧은 간격으로 두 값 사이에서 계속 바꿔 스프링이 한 번도
// 완전히 멈추지 않게 한다(어느 순간을 잘라도 항상 진행 중인 움직임이 있다).
import { useEffect, useRef, useState } from "react";
import styles from "./RingOvershoot.module.scss";

type Box<T> = { current: T };

const STRINGS: Record<string, string> = { idle: "대기 중", running: "일치율 계산 중", done: "일치 확인" };
const R = 46;
const CIRC = 2 * Math.PI * R;

export default function RingOvershoot() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const fillRef = useRef(null) as unknown as Box<SVGCircleElement>;
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState(STRINGS.idle);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const STIFFNESS = 0.0006;
    const DAMPING = 0.02;
    const TARGET = 0.82;
    const AUTO_HIGH = 0.82;
    const AUTO_LOW = 0.28;
    const FLIP_MS = 480;
    const SETTLE_EPS = 0.0006;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;
    fill.style.strokeDasharray = CIRC.toFixed(2);

    let isDemo = true;
    let manualRunning = false;
    let manualPos = 0, manualVel = 0, manualLastTs = 0;
    let autoPos = 0, autoVel = 0, autoLastTs = 0, autoTargetHigh = true, autoFlipAt = 0;
    let rafId = 0;

    function paint(pos: number) {
      const shown = Math.max(0, pos);
      const offset = CIRC * (1 - Math.min(shown, 1.3));
      fill!.style.strokeDashoffset = offset.toFixed(2);
      setPct(Math.round(shown * 100));
    }

    function runManual(ts: number) {
      if (!manualLastTs) manualLastTs = ts;
      const dt = Math.min(ts - manualLastTs, 32);
      manualLastTs = ts;
      const force = (TARGET - manualPos) * STIFFNESS - manualVel * DAMPING;
      manualVel += force * dt;
      manualPos += manualVel * dt;
      paint(manualPos);
      if (Math.abs(manualVel) > SETTLE_EPS || Math.abs(TARGET - manualPos) > SETTLE_EPS) {
        setStatus(STRINGS.running);
        rafId = requestAnimationFrame(runManual);
      } else {
        manualPos = TARGET;
        manualVel = 0;
        paint(manualPos);
        setStatus(STRINGS.done);
        manualRunning = false;
        setPressed(false);
      }
    }

    function trigger() {
      if (manualRunning || isDemo) return;
      manualRunning = true;
      manualPos = 0; manualVel = 0; manualLastTs = 0;
      setPressed(true);
      if (reduce) {
        manualPos = TARGET; manualVel = 0;
        paint(manualPos);
        setStatus(STRINGS.done);
        manualRunning = false;
        setPressed(false);
        return;
      }
      rafId = requestAnimationFrame(runManual);
    }

    function human() {
      if (isDemo) {
        isDemo = false;
        root!.classList.remove(styles.isDemo);
        cancelAnimationFrame(rafId);
        setStatus(STRINGS.idle);
        paint(0);
      }
    }

    function onClick() { human(); trigger(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    paint(0);

    function autoLoop(ts: number) {
      if (!isDemo || reduce) return;
      if (!autoLastTs) autoLastTs = ts;
      const dt = Math.min(ts - autoLastTs, 32);
      autoLastTs = ts;
      if (!autoFlipAt) autoFlipAt = ts + FLIP_MS;
      if (ts >= autoFlipAt) { autoTargetHigh = !autoTargetHigh; autoFlipAt = ts + FLIP_MS; }
      const target = autoTargetHigh ? AUTO_HIGH : AUTO_LOW;
      const force = (target - autoPos) * STIFFNESS - autoVel * DAMPING;
      autoVel += force * dt;
      autoPos += autoVel * dt;
      paint(autoPos);
      setStatus(STRINGS.running);
      rafId = requestAnimationFrame(autoLoop);
    }

    if (isDemo && !reduce) {
      rafId = requestAnimationFrame(autoLoop);
    } else if (reduce) {
      paint(TARGET);
      setStatus(STRINGS.done);
    }

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ringWrap}>
        <button
          type="button"
          className={styles.ring + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.ringIcon} viewBox="0 0 120 120" aria-hidden="true">
            <circle className={styles.ringTrack} cx={60} cy={60} r={R} />
            <circle className={styles.ringFill} ref={fillRef} cx={60} cy={60} r={R} />
            <text className={styles.ringPct} x={60} y={66} textAnchor="middle">{pct}%</text>
          </svg>
          <span className={styles.ringLabel}>일치율 확인</span>
        </button>
        <p className={styles.ringStatus}>{status}</p>
      </div>
    </main>
  );
}
