// WireframeVertexSnap — vanilla 판(run/399/demo/02-loader-3d-wireframe-vertex-snap/index.html) 의 React 포트.
// 시작 산점 좌표(고정 배열)에서 목표 정육면체 모서리까지 진행률을 지수 곡선(ease)으로 보간하고,
// 매 프레임 getBoundingClientRect() 로 preserve-3d 가 투영한 실제 화면 좌표를 읽어 SVG 선을 다시 그린다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./WireframeVertexSnap.module.scss";

export type WireframeVertexSnapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const EDGES: [number, number][] = [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
const HALF = 42;
const TARGETS: [number, number, number][] = [0,1,2,3,4,5,6,7].map((i) => [
  (i & 1) ? HALF : -HALF, (i & 2) ? HALF : -HALF, (i & 4) ? HALF : -HALF,
]);
const SCATTER: [number, number, number][] = [
  [-70, -55, 10], [60, -65, -20], [-50, 60, 30], [75, 50, -10],
  [-65, -30, -40], [55, -20, 45], [-40, 65, -25], [65, 70, 15],
];
const LOOP = 2;
const REDUCE_P = 0.7;
const LERP_EASE_POW = 1.8; // 정점 수렴 곡선 지수 — 변형 02 대상
const ROT_TURNS = 1;
const FIELD_LABEL = "와이어프레임 정점 수렴 진행 실험판";

export default function WireframeVertexSnap({
  duration = "2s",
  easing = "linear",
  color = "#17141a",
}: WireframeVertexSnapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const vtxRef = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null, null, null]) as Box<(HTMLDivElement | null)[]>;
  const lineRef = useRef<(SVGLineElement | null)[]>(new Array(12).fill(null)) as Box<(SVGLineElement | null)[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const lastPRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function ease(p: number): number {
    return Math.pow(p, LERP_EASE_POW);
  }

  function updateLines(e: number): void {
    const field = fieldRef.current;
    const vtx = vtxRef.current;
    const lines = lineRef.current;
    if (!field) return;
    const fr = field.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      const av = vtx[EDGES[i][0]];
      const bv = vtx[EDGES[i][1]];
      const ln = lines[i];
      if (!av || !bv || !ln) continue;
      const a = av.getBoundingClientRect();
      const b = bv.getBoundingClientRect();
      const ax = a.left + a.width / 2 - fr.left;
      const ay = a.top + a.height / 2 - fr.top;
      const bx = b.left + b.width / 2 - fr.left;
      const by = b.top + b.height / 2 - fr.top;
      ln.setAttribute("x1", String(ax));
      ln.setAttribute("y1", String(ay));
      ln.setAttribute("x2", String(bx));
      ln.setAttribute("y2", String(by));
      ln.setAttribute("stroke-opacity", String(0.15 + 0.85 * e));
    }
  }

  function render(p: number): void {
    lastPRef.current = p;
    const e = ease(p);
    const cube = cubeRef.current;
    const rotY = (p * 360 * ROT_TURNS) % 360;
    if (cube) cube.style.transform = "rotateX(18deg) rotateY(" + rotY + "deg)";
    const vtx = vtxRef.current;
    for (let i = 0; i < 8; i++) {
      const el = vtx[i];
      if (!el) continue;
      const [sx, sy, sz] = SCATTER[i];
      const [tx, ty, tz] = TARGETS[i];
      const cx = sx + (tx - sx) * e;
      const cy = sy + (ty - sy) * e;
      const cz = sz + (tz - sz) * e;
      el.style.transform = "translate3d(" + cx + "px," + cy + "px," + cz + "px)";
      el.style.opacity = String(0.25 + 0.75 * e);
    }
    updateLines(e);
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
            <div className={styles.cube} ref={cubeRef}>
              <svg className={styles.svg}>
                {EDGES.map((_, i) => (
                  <line key={i} className={styles.edge} ref={(el: SVGLineElement | null) => { lineRef.current[i] = el; }} />
                ))}
              </svg>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className={styles.vtx} ref={(el: HTMLDivElement | null) => { vtxRef.current[i] = el; }} />
              ))}
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
