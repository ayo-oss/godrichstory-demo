// CursorRotateButton — vanilla 판(run/393/demo/01-pointer-tilt-3d-cursor-rotate/index.html) 의 React 포트.
// 버튼 안 커서 좌표를 -1~1 로 정규화해 목표값(target)을 만들고, 관성 lerp 로 현재값(cur)이 따라간다.
// 포인터가 없을 때(자동 시연)는 위상이 어긋난 두 사인파(리사주 궤적)를 목표값으로 써 같은 계산을 돌린다.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./CursorRotateButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 14;
const LERP = 0.16;
const LABEL = "지금 시작하기 — 커서를 따라 기울어지는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 1.15), Math.sin(t * 0.82 + 1.05)];
}

export default function CursorRotateButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const sheenRef = useRef<HTMLSpanElement | null>(null);
  const targetXRef = useRef<number>(0) as Box<number>;
  const targetYRef = useRef<number>(0) as Box<number>;
  const curXRef = useRef<number>(0) as Box<number>;
  const curYRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const clickTimerRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(nx: number, ny: number): void {
    const btn = btnRef.current;
    const sheen = sheenRef.current;
    if (!btn || !sheen) return;
    const rotY = nx * MAX_DEG;
    const rotX = -ny * MAX_DEG;
    btn.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    const sx = 50 + nx * 34;
    const sy = 50 + ny * 34;
    sheen.style.background =
      "radial-gradient(circle at " + sx.toFixed(1) + "% " + sy.toFixed(1) + "%, rgba(255,247,230,.5), rgba(255,247,230,0) 58%)";
    const depth = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    btn.style.boxShadow =
      "0 " + (10 + depth * 16).toFixed(1) + "px " + (18 + depth * 22).toFixed(1) + "px rgba(8,6,12," + (0.3 + depth * 0.16).toFixed(2) + ")";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.5, -0.34);
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
    targetXRef.current = 0.92;
    targetYRef.current = -0.62;
    if (reduce) render(targetXRef.current, targetYRef.current);
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      hasPointerRef.current = false;
      targetXRef.current = 0;
      targetYRef.current = 0;
      if (reduce) render(targetXRef.current, targetYRef.current);
    }, 260);
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

  const cls = [styles.cr, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>커서를 버튼 위에서 움직이면 좌표 값이 rotateX·rotateY 를 계산합니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.sheen} ref={sheenRef} aria-hidden="true" />
            <span className={styles.label}>지금 시작하기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
