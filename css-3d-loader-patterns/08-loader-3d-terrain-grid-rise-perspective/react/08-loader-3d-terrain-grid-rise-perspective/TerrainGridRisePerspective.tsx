// TerrainGridRisePerspective — vanilla 판(run/399/demo/08-loader-3d-terrain-grid-rise-perspective/index.html) 의 React 포트.
// 격자점마다 고정된(무작위 없음) 높이 가중치를 결정적으로 계산해 진행률만큼 끌어올리고,
// 점마다 다른 Z 값을 CSS 원근 투영에 맡겨 가까운 점은 크게 먼 점은 작게 보이게 한다.
// 01~07 과 다른 축 — 고정 가중치 필드 값을 원근 투영과 결합한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TerrainGridRisePerspective.module.scss";

export type TerrainGridRisePerspectiveProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const GRID_COLS = 7;
const GRID_ROWS = 5;
const COL_GAP = 20;
const ROW_GAP = 24;
const HEIGHT_SCALE = 54;
const ROT_TURNS = 0.35;
const TILT = 58;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "지형 격자 원근 진행 실험판";

function weightOf(col: number, row: number): number {
  return (Math.sin(col * 1.1 + row * 0.6) + Math.cos(row * 1.3 - col * 0.4) + 2) / 4;
}

const BASE: { x: number; z: number; w: number; row: number }[] = [];
for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    const x = (col - (GRID_COLS - 1) / 2) * COL_GAP;
    const z = row * ROW_GAP;
    BASE.push({ x, z, w: weightOf(col, row), row });
  }
}

export default function TerrainGridRisePerspective({
  duration = "2s",
  easing = "linear",
  color = "#0a4fe8",
}: TerrainGridRisePerspectiveProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const ptsRef = useRef<(HTMLDivElement | null)[]>(new Array(BASE.length).fill(null)) as Box<(HTMLDivElement | null)[]>;
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
    const grid = gridRef.current;
    if (grid) grid.style.transform = "rotateX(" + TILT + "deg) rotateZ(" + rotY + "deg)";
    const pts = ptsRef.current;
    for (let i = 0; i < BASE.length; i++) {
      const el = pts[i];
      if (!el) continue;
      const b = BASE[i];
      const rise = b.w * p * HEIGHT_SCALE;
      el.style.transform = "translate3d(" + b.x + "px," + (-rise) + "px," + b.z + "px)";
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
            <div className={styles.grid} ref={gridRef}>
              {BASE.map((b, i) => (
                <div key={i} className={styles.pt} style={{ zIndex: b.row }} ref={(el: HTMLDivElement | null) => { ptsRef.current[i] = el; }} />
              ))}
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
