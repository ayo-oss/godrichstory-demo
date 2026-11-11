// SpherePointConverge — vanilla 판(run/399/demo/05-loader-3d-sphere-point-converge/index.html) 의 React 포트.
// 피보나치 구 분포 공식(고정, 무작위 없음)으로 점을 구 표면에 배치하고, 진행률 값이 오를수록
// 각 점의 좌표를 중심(0,0,0) 쪽으로 선형 수축시킨다.
// 395(캔버스 rAF 물리)·393(포인터 tilt) 과 다른 축 — 구면 분포 공식으로 점을 배치하고 중심 수렴 비율을 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SpherePointConverge.module.scss";

export type SpherePointConvergeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const POINT_COUNT = 28;
const SPHERE_R = 78;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const ROT_TURNS = 0.5;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "구면 점 수렴 진행 실험판";

const BASE: [number, number, number][] = Array.from({ length: POINT_COUNT }, (_, i) => {
  const y = 1 - (i / (POINT_COUNT - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * i;
  return [Math.cos(theta) * r * SPHERE_R, y * SPHERE_R, Math.sin(theta) * r * SPHERE_R];
});

export default function SpherePointConverge({
  duration = "2s",
  easing = "linear",
  color = "#0a4fe8",
}: SpherePointConvergeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const sphereRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const ptsRef = useRef<(HTMLDivElement | null)[]>(new Array(POINT_COUNT).fill(null)) as Box<(HTMLDivElement | null)[]>;
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
    const rotY = (p * 360 * ROT_TURNS) % 360;
    const shrink = 1 - p;
    const sphere = sphereRef.current;
    if (sphere) sphere.style.transform = "rotateY(" + rotY + "deg) rotateX(14deg)";
    const pts = ptsRef.current;
    for (let i = 0; i < POINT_COUNT; i++) {
      const el = pts[i];
      if (!el) continue;
      const [bx, by, bz] = BASE[i];
      const x = bx * shrink, y = by * shrink, z = bz * shrink;
      el.style.transform = "translate3d(" + x + "px," + y + "px," + z + "px)";
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
          <div className={styles.scene}>
            <div className={styles.sphere} ref={sphereRef}>
              {BASE.map((_, i) => (
                <div key={i} className={styles.pt} ref={(el: HTMLDivElement | null) => { ptsRef.current[i] = el; }} />
              ))}
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
