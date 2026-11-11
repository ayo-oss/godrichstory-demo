// RingOrbitTiltStack — vanilla 판(run/399/demo/04-loader-3d-ring-orbit-tilt-stack/index.html) 의 React 포트.
// 고리마다 다른 시작 기울기(rotateX)를 진행률 비율만큼 0(정면) 으로 개별 보간한다.
// 395(캔버스 rAF 물리)·393(포인터 tilt) 과 다른 축 — 고리마다 다른 시작 기울기를 진행률에 비례해 개별 보간한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RingOrbitTiltStack.module.scss";

export type RingOrbitTiltStackProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const INITIAL_TILT = [72, 54, 36, 18];
const SPIN_TURNS = 0.6;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "궤도 고리 기울기 수렴 진행 실험판";

export default function RingOrbitTiltStack({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8",
}: RingOrbitTiltStackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const ringsRef = useRef<(HTMLDivElement | null)[]>([null, null, null, null]) as Box<(HTMLDivElement | null)[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const lastPRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  const ringClasses = [styles.ring0, styles.ring1, styles.ring2, styles.ring3];

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function render(p: number): void {
    lastPRef.current = p;
    const spinY = (p * 360 * SPIN_TURNS) % 360;
    const rings = ringsRef.current;
    for (let i = 0; i < rings.length; i++) {
      const el = rings[i];
      if (!el) continue;
      const tilt = INITIAL_TILT[i] * (1 - p);
      el.style.transform = "rotateY(" + spinY + "deg) rotateX(" + tilt + "deg)";
    }
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
          <div className={styles.orbit}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.ring + " " + ringClasses[i]} ref={(el: HTMLDivElement | null) => { ringsRef.current[i] = el; }} />
            ))}
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
