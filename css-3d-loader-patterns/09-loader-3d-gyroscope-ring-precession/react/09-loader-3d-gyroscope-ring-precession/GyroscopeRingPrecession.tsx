// GyroscopeRingPrecession — vanilla 판(run/399/demo/09-loader-3d-gyroscope-ring-precession/index.html) 의 React 포트.
// 안쪽 고리의 회전축이 그리는 원뿔 — 세차각(진행률에 비례해 커진다)을 원뿔 위상의 cos/sin 으로
// X축·Z축 두 방향에 나눠 실어, 축 자체가 원을 그리며 벌어지는 세차운동을 흉내 낸다.
// 01~08 과 다른 축 — 세차각을 원뿔 위상의 삼각함수로 두 축에 나눠 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GyroscopeRingPrecession.module.scss";

export type GyroscopeRingPrecessionProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const OUTER_TILT = 22;
const SPIN_TURNS = 1;
const PRECESSION_TURNS = 1.5;
const PRECESSION_FACTOR = 26;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "자이로스코프 세차 고리 진행 실험판";

export default function GyroscopeRingPrecession({
  duration = "2s",
  easing = "linear",
  color = "#0a4fe8",
}: GyroscopeRingPrecessionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const lastPRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function render(p: number): void {
    lastPRef.current = p;
    const spinY = (p * 360 * SPIN_TURNS) % 360;
    const maxAngle = PRECESSION_FACTOR * p;
    const conePhase = (p * 360 * PRECESSION_TURNS) % 360;
    const rad = (conePhase * Math.PI) / 180;
    const tiltX = OUTER_TILT + maxAngle * Math.cos(rad);
    const tiltZ = maxAngle * Math.sin(rad);
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (outer) outer.style.transform = "rotateY(" + spinY + "deg) rotateX(" + OUTER_TILT + "deg)";
    if (inner) inner.style.transform = "rotateY(" + spinY + "deg) rotateX(" + tiltX + "deg) rotateZ(" + tiltZ + "deg)";
    if (pctRef.current) pctRef.current.textContent = Math.round(p * 100) + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
    render(reduced() ? REDUCE_P : lastPRef.current);
  }

  function restart(): void {
    t0Ref.current = performance.now();
    render(reduced() ? REDUCE_P : 0);
  }

  function onKey(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
  }

  function onClick(): void {
    togglePause();
  }

  function onResize(): void {
    if (pausedRef.current || reduced()) render(reduced() ? REDUCE_P : lastPRef.current);
  }

  function frame(now: number): void {
    if (!pausedRef.current) {
      const t = (now - t0Ref.current) / 1000;
      render((t % LOOP) / LOOP);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    t0Ref.current = performance.now();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const root = rootRef.current;
      if (root) root.classList.add("is-still");
      render(REDUCE_P);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>클릭하거나 스페이스바를 누르면 멈추거나 다시 갑니다</p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKey}
        >
          <div className={styles.scene}>
            <div className={styles.gyro}>
              <div className={styles.ring + " " + styles.ringOuter} ref={outerRef} />
              <div className={styles.ring + " " + styles.ringInner} ref={innerRef} />
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
