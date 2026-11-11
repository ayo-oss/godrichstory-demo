// CubeFaceSwap — vanilla 판(run/399/demo/01-loader-3d-cube-face-percent-swap/index.html) 의 React 포트.
// 진행률(0~1)이 FACE_THRESHOLD 문턱을 넘을 때마다 큐브를 90deg 돌리고, 매 프레임 화가 알고리즘
// (면 법선 각 + 현재 회전각의 cos) 으로 z-index 를 다시 매긴다. 움직임은 rAF 루프가 다 계산하므로
// @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CubeFaceSwap.module.scss";

export type CubeFaceSwapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const NORMALS = [0, 90, 180, 270]; // front·right·back·left 면 법선 각
const LOOP = 2;           // 로더 한 바퀴(초) — 캡처 창(2초)의 약수라 gif 가 끊기지 않는다
const REDUCE_P = 0.7;
const FACE_THRESHOLD = 25; // 면 하나를 넘길 진행률 문턱(%) — 변형 01 대상
const FIELD_LABEL = "정육면체 면 전환 진행 실험판";

export default function CubeFaceSwap({
  duration = "2s",                             // vanilla LOOP
  easing = "linear",                           // vanilla $easing
  color = "#0a4fe8",                           // vanilla $color: $subject-blue-deep
}: CubeFaceSwapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const facesRef = useRef<HTMLDivElement[]>([]) as Box<HTMLDivElement[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const lastPRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 화가 알고리즘 — 각 면의 (법선각 + 현재 회전각) 코사인을 깊이로 써서 뒤에서 앞 순서로 z-index 를 매긴다.
  function depthSort(rotY: number): void {
    const faces = facesRef.current;
    const withDepth = faces.map((el, i) => ({ el, depth: Math.cos((NORMALS[i] + rotY) * Math.PI / 180) }));
    withDepth.sort((a, b) => a.depth - b.depth);
    withDepth.forEach((o, idx) => { o.el.style.zIndex = String(idx); });
  }

  function render(p: number): void {
    lastPRef.current = p;
    const pct = Math.round(p * 100);
    const faces = facesRef.current;
    const idx = Math.min(faces.length - 1, Math.floor(pct / FACE_THRESHOLD));
    const rotY = idx * 90;
    const cube = cubeRef.current;
    if (cube) cube.style.transform = "rotateY(" + rotY + "deg)";
    depthSort(rotY);
    if (pctRef.current) pctRef.current.textContent = pct + "%";
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
    const cube = cubeRef.current;
    if (cube) facesRef.current = Array.prototype.slice.call(cube.children) as HTMLDivElement[];
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
              <div className={styles.face + " " + styles.faceFront}>1</div>
              <div className={styles.face + " " + styles.faceRight}>2</div>
              <div className={styles.face + " " + styles.faceBack}>3</div>
              <div className={styles.face + " " + styles.faceLeft}>4</div>
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
