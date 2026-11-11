// EdgeBevelButton — vanilla 판(run/393/demo/05-pointer-tilt-3d-edge-bevel/index.html) 의 React 포트.
// 기울기 벡터의 각도(atan2)·크기를 conic-gradient 의 회전각·광 폭·투명도로 바꿔 테두리 띠가
// 기운 방향을 따라 밝아지게 한다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./EdgeBevelButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 13; // 불변
const LERP = 0.16;
const LABEL = "자세히 보기 — 기울기 크기로 테두리가 밝아지는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticTarget(t: number): [number, number] {
  return [Math.sin(t * 1.2 + 0.6), Math.sin(t * 0.88)];
}

export default function EdgeBevelButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const bevelRef = useRef<HTMLSpanElement | null>(null);
  const floorRef = useRef<HTMLSpanElement | null>(null);
  const sideRef = useRef<HTMLSpanElement | null>(null);
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
    const bevel = bevelRef.current;
    const floor = floorRef.current;
    const side = sideRef.current;
    if (!btn || !bevel || !floor || !side) return;
    const rotY = nx * MAX_DEG;
    const rotX = -ny * MAX_DEG;
    btn.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    const mag = clamp(Math.sqrt(nx * nx + ny * ny), 0, 1);
    const ang = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
    const width = 70 + mag * 110;
    const alpha = (0.38 + mag * 0.6).toFixed(2);
    bevel.style.background =
      "conic-gradient(from " + ang.toFixed(1) + "deg, rgba(91,140,248,0), rgba(91,140,248," + alpha + ") " + (width / 2).toFixed(1) + "deg, rgba(91,140,248,0) " + width.toFixed(1) + "deg)";
    const floorShift = nx * 46;
    floor.style.transform = "translateX(" + floorShift.toFixed(1) + "px) scale(" + (1 + mag * 0.4).toFixed(2) + ")";
    floor.style.opacity = (0.14 + mag * 0.7).toFixed(2);
    side.style.transform = "scaleY(" + (0.4 + mag * 2.6).toFixed(2) + ")";
    side.style.opacity = (0.25 + mag * 0.7).toFixed(2);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.5, 0.5);
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
    targetXRef.current = 0.9;
    targetYRef.current = 0.9;
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

  const cls = [styles.eb, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>기울기 크기를 각도로 바꿔 얇은 테두리 띠가 그 방향을 따라 밝아집니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <span className={styles.floor} ref={floorRef} aria-hidden="true" />
          <div className={styles.wrap}>
            <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
              <span className={styles.bevel} ref={bevelRef} aria-hidden="true" />
              <span className={styles.label}>자세히 보기</span>
            </button>
            <span className={styles.side} ref={sideRef} aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}
