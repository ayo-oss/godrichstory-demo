// GridParallaxButton — vanilla 판(run/393/demo/07-pointer-tilt-3d-grid-parallax/index.html) 의 React 포트.
// 같은 정규화 좌표를 두 격자 층에 서로 다른 배수·부호로 곱해 배경 위치를 옮긴다 — 두 층이
// 다른 속도로 어긋나며 시차(parallax) 깊이를 만든다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./GridParallaxButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 9;
const LERP = 0.16;
const FAR_DEPTH = 10;
const NEAR_DEPTH = 26;
const LABEL = "컬렉션 보기 — 격자 두 겹이 시차로 어긋나는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 0.9), Math.sin(t * 1.4 + 1.6)];
}

export default function GridParallaxButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const gridFarRef = useRef<HTMLSpanElement | null>(null);
  const gridNearRef = useRef<HTMLSpanElement | null>(null);
  const targetXRef = useRef<number>(0) as Box<number>;
  const targetYRef = useRef<number>(0) as Box<number>;
  const curXRef = useRef<number>(0) as Box<number>;
  const curYRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(nx: number, ny: number): void {
    const btn = btnRef.current;
    const gridFar = gridFarRef.current;
    const gridNear = gridNearRef.current;
    if (!btn || !gridFar || !gridNear) return;
    btn.style.transform = "rotateX(" + (-ny * MAX_DEG).toFixed(2) + "deg) rotateY(" + (nx * MAX_DEG).toFixed(2) + "deg)";
    gridFar.style.backgroundPosition = (nx * FAR_DEPTH).toFixed(1) + "px " + (ny * FAR_DEPTH).toFixed(1) + "px";
    gridNear.style.backgroundPosition = (-nx * NEAR_DEPTH).toFixed(1) + "px " + (-ny * NEAR_DEPTH).toFixed(1) + "px";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.4, -0.3);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const s = syntheticTarget(t);
        targetXRef.current = s[0];
        targetYRef.current = s[1];
      }
      curXRef.current += (targetXRef.current - curXRef.current) * LERP;
      curYRef.current += (targetYRef.current - curYRef.current) * LERP;
      render(curXRef.current, curYRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): [number, number] {
    const scene = sceneRef.current;
    if (!scene) return [0, 0];
    const r = scene.getBoundingClientRect();
    const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((event.clientY - r.top) / r.height) * 2 - 1;
    return [clamp(nx, -1, 1), clamp(ny, -1, 1)];
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const p = pointFromEvent(event);
    targetXRef.current = p[0];
    targetYRef.current = p[1];
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetXRef.current = 0;
    targetYRef.current = 0;
  }

  function onClick(): void {
    setDemo(false);
    hasPointerRef.current = true;
    targetXRef.current = -0.85;
    targetYRef.current = -0.4;
    if (reduce) render(targetXRef.current, targetYRef.current);
    window.setTimeout(() => {
      if (!hasPointerRef.current) {
        targetXRef.current = 0;
        targetYRef.current = 0;
        if (reduce) render(targetXRef.current, targetYRef.current);
      }
    }, 240);
  }

  function onKeyDown(event: KeyEvt): void {
    const step = 0.24;
    const moves: { [key: string]: [number, number] } = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[event.key];
    if (!m) return;
    event.preventDefault();
    setDemo(false);
    hasPointerRef.current = true;
    targetXRef.current = clamp(targetXRef.current + m[0], -1, 1);
    targetYRef.current = clamp(targetYRef.current + m[1], -1, 1);
    if (reduce) render(targetXRef.current, targetYRef.current);
  }

  const cls = [styles.gp, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>같은 좌표를 배수 둘로 곱해 안쪽 격자와 바깥 격자가 서로 다른 속도로 어긋납니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={`${styles.grid} ${styles.gridFar}`} ref={gridFarRef} aria-hidden="true" />
            <span className={`${styles.grid} ${styles.gridNear}`} ref={gridNearRef} aria-hidden="true" />
            <span className={styles.label}>컬렉션 보기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
