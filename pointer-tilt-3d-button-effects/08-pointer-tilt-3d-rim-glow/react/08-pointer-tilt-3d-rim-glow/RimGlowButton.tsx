// RimGlowButton — vanilla 판(run/393/demo/08-pointer-tilt-3d-rim-glow/index.html) 의 React 포트.
// 기울기 벡터에서 방향은 회전에만 쓰고, 크기(magnitude)만 따로 읽어 둘레 광의 반경·번짐·밝기로
// 바꾼다(05 의 방향성 테두리 광과는 다른 값). 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./RimGlowButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 10;
const LERP = 0.16;
const BLUR_BASE = 6;
const BLUR_RANGE = 34;
const LABEL = "지금 플레이 — 기울기 크기로 둘레가 밝아지는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 1.1 + 0.3), Math.sin(t * 1.6)];
}

export default function RimGlowButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
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
    if (!btn) return;
    btn.style.transform = "rotateX(" + (-ny * MAX_DEG).toFixed(2) + "deg) rotateY(" + (nx * MAX_DEG).toFixed(2) + "deg)";
    const mag = clamp(Math.sqrt(nx * nx + ny * ny), 0, 1);
    const blur = BLUR_BASE + mag * BLUR_RANGE;
    const spread = 1 + mag * 5;
    const alpha = (0.28 + mag * 0.5).toFixed(2);
    btn.style.boxShadow = "0 0 " + blur.toFixed(1) + "px " + spread.toFixed(1) + "px rgba(91,140,248," + alpha + "), 0 12px 20px rgba(23,20,26,.28)";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.5, 0.4);
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
    targetXRef.current = 0.95;
    targetYRef.current = 0.3;
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

  const cls = [styles.rg, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>기울기 크기(방향과 무관)만 골라 둘레 전체의 광 반경·밝기로 바꿉니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.label}>지금 플레이</span>
          </button>
        </div>
      </div>
    </main>
  );
}
