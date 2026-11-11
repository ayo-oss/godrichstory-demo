// ShadowStackButton — vanilla 판(run/393/demo/03-pointer-tilt-3d-shadow-stack/index.html) 의 React 포트.
// 정규화된 포인터 좌표의 반대 방향으로 그림자 3겹을 서로 다른 거리·흐림·투명도로 쌓아 깊이를 만든다.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./ShadowStackButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 12;
const LERP = 0.15;
const LABEL = "지금 구매하기 — 기울기에 따라 그림자가 쌓이는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 0.95 + 0.4), Math.sin(t * 1.35)];
}

export default function ShadowStackButton() {
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
    const rotY = nx * MAX_DEG;
    const rotX = -ny * MAX_DEG;
    btn.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    const ox = -nx;
    const oy = -ny;
    const layers: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = i * 7;
      const blur = i * 9;
      const alpha = (0.22 - i * 0.03).toFixed(2);
      layers.push((ox * d).toFixed(1) + "px " + (oy * d + i * 3).toFixed(1) + "px " + blur + "px rgba(23,20,26," + alpha + ")");
    }
    btn.style.boxShadow = layers.join(", ");
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(-0.4, 0.3);
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
    targetXRef.current = -0.8;
    targetYRef.current = 0.5;
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
    const step = 0.22;
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

  const cls = [styles.sk, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>기운 방향의 반대쪽으로 그림자 세 겹이 어긋나 쌓입니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.label}>지금 구매하기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
