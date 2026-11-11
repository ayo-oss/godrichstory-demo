// StepSpringFillConnector — vanilla 판(run/420/demo/01-step-precision-connector-spring-fill/index.html) 의 React 포트.
// 값 하나: 연결선 채움 비율(pos)이 스프링 방정식(SPRING_STIFFNESS·SPRING_DAMPING)을 매 프레임 적분한 값이다.
// 목표를 넘어서면 STEP_CONNECTOR_OVERSHOOT_PERCENT 로 정한 MAX_FILL 에서 튕겨(vel *= -0.35) 되돌아온다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepSpringFillConnector.module.scss";

type Box<T> = { current: T };
type Spring = { pos: number; vel: number; target: number };

const STEP_CONNECTOR_OVERSHOOT_PERCENT = 10;
const SPRING_STIFFNESS = 180;
const SPRING_DAMPING = 16;
const SPRING_KICK_VELOCITY = 3.2;
const STEP_COUNT = 4;
const MAX_FILL = 1 + STEP_CONNECTOR_OVERSHOOT_PERCENT / 100;
const LABELS = ["계정", "정보", "확인", "완료"];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function StepSpringFillConnector() {
  const [current, setCurrent] = useState(0);
  const [reduce, setReduce] = useState(false);
  const currentRef = useRef<number>(0) as Box<number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const fillRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null]) as Box<Array<HTMLSpanElement | null>>;
  const circleRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null, null]) as Box<Array<HTMLButtonElement | null>>;
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const springsRef = useRef<Spring[]>([0, 1, 2].map(() => ({ pos: 0, vel: 0, target: 0 }))) as Box<Spring[]>;
  const frameRef = useRef<number>(0) as Box<number>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function integrate(s: Spring, dt: number): void {
    const accel = SPRING_STIFFNESS * (s.target - s.pos) - SPRING_DAMPING * s.vel;
    s.vel += accel * dt;
    s.pos += s.vel * dt;
    if (s.target > 0 && s.pos > MAX_FILL) { s.pos = MAX_FILL; s.vel *= -0.35; }
    if (s.target === 0 && s.pos < 0) { s.pos = 0; s.vel = 0; }
    if (Math.abs(s.pos - s.target) < 0.001 && Math.abs(s.vel) < 0.01) { s.pos = s.target; s.vel = 0; }
  }

  function kick(s: Spring): void {
    s.vel += (s.target > s.pos ? 1 : -1) * SPRING_KICK_VELOCITY;
  }

  function paintFills(): void {
    let maxGlow = 0;
    springsRef.current.forEach((s, i) => {
      const el = fillRefs.current[i];
      const p = reduce ? s.target : clamp(s.pos, 0, MAX_FILL);
      const over = clamp((p - 1) / (STEP_CONNECTOR_OVERSHOOT_PERCENT / 100), 0, 1);
      if (el) {
        el.style.transform = "scaleX(" + p.toFixed(4) + ")";
        el.style.setProperty("--glow", over.toFixed(3));
      }
      const node = circleRefs.current[i + 1];
      if (node) node.style.setProperty("--glow", over.toFixed(3));
      if (over > maxGlow) maxGlow = over;
    });
    if (rootRef.current) rootRef.current.style.setProperty("--stageGlow", maxGlow.toFixed(3));
  }

  function goTo(next: number): void {
    const clamped = clamp(next, 0, STEP_COUNT - 1);
    if (clamped === currentRef.current) return;
    const from = currentRef.current;
    if (clamped > from) {
      for (let i = from; i < clamped; i += 1) { springsRef.current[i].target = 1; kick(springsRef.current[i]); }
    } else {
      for (let j = clamped; j < from; j += 1) { springsRef.current[j].target = 0; kick(springsRef.current[j]); }
    }
    currentRef.current = clamped;
    setCurrent(clamped);
  }

  useEffect(() => {
    let startTime = 0;
    let lastNow = 0;
    let phase = 0;
    function tick(now: number): void {
      if (startTime === 0) { startTime = now; lastNow = now; }
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const t = ((now - startTime) / 1000) % 2;
      if (demoRef.current) {
        if (t < 0.05 && phase !== 0) phase = 0;
        if (phase === 0 && t > 0.2) { goTo(clamp(currentRef.current + 1, 0, STEP_COUNT - 1)); phase = 1; }
        if (phase === 1 && t > 0.75) { goTo(clamp(currentRef.current + 1, 0, STEP_COUNT - 1)); phase = 2; }
        if (phase === 2 && t > 1.3) { goTo(clamp(currentRef.current + 1, 0, STEP_COUNT - 1)); phase = 3; }
        if (phase === 3 && t > 1.85) { goTo(0); phase = 4; }
      }
      if (!reduce) springsRef.current.forEach((s) => integrate(s, dt));
      paintFills();
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function stopDemo(): void { demoRef.current = false; }

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); goTo(currentRef.current + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopDemo(); goTo(currentRef.current - 1); e.preventDefault(); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.cs} onKeyDown={onKeyDown} ref={(el: HTMLDivElement | null) => { rootRef.current = el; }}>
        <ol className={styles.row} role="list" aria-label="가입 진행 단계">
          {LABELS.map((label, i) => (
            <li key={label} style={{ display: "contents" }}>
              <div className={styles.node}>
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
              {i < STEP_COUNT - 1 && (
                <div className={styles.connector}>
                  <span className={styles.connectorTrack} />
                  <span className={styles.connectorFill} ref={(el: HTMLSpanElement | null) => { fillRefs.current[i] = el; }} />
                </div>
              )}
            </li>
          ))}
        </ol>
        <p className={styles.status} aria-live="polite">{(current + 1) + "단계 / " + STEP_COUNT + "단계"}</p>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} disabled={current === 0} onClick={() => { stopDemo(); goTo(current - 1); }}>이전</button>
          <button type="button" className={[styles.btn, styles.btnPrimary].join(" ")} disabled={current === STEP_COUNT - 1} onClick={() => { stopDemo(); goTo(current + 1); }}>다음</button>
        </div>
      </div>
    </main>
  );
}
