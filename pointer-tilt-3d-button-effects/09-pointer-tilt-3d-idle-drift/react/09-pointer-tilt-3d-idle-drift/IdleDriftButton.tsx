// IdleDriftButton — vanilla 판(run/393/demo/09-pointer-tilt-3d-idle-drift/index.html) 의 React 포트.
// 주파수·위상이 다른 사인파 둘을 더한 합성 곡선(고정 시드)이 유휴 드리프트를 만들고,
// 포인터가 있으면 그 좌표가 목표값을 덮어쓴다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./IdleDriftButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const MAX_DEG = 8; // 불변
const LERP = 0.12;
const LABEL = "무료로 시작하기 — 가만히 둬도 떠도는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
// 진폭 상수를 키워 자동 시연에서도 가장자리(±1, MAX_DEG 전체)까지 실제로 닿게 한다
function idleDrift(t: number): [number, number] {
  const x = 0.85 * Math.sin(t * 0.55) + 0.55 * Math.sin(t * 1.31 + 0.8);
  const y = 0.76 * Math.sin(t * 0.41 + 1.3) + 0.48 * Math.sin(t * 0.97 + 2.4);
  return [clamp(x, -1, 1), clamp(y, -1, 1)];
}

export default function IdleDriftButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const floorRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
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
    const floor = floorRef.current;
    const glow = glowRef.current;
    if (!btn || !floor || !glow) return;
    const rotY = nx * MAX_DEG;
    const rotX = -ny * MAX_DEG;
    const mag = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    const lift = 1 - mag * 0.4;
    btn.style.transform = "translateY(" + ((1 - lift) * -6).toFixed(2) + "px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    const blur = 16 + Math.abs(nx) * 10 + Math.abs(ny) * 10;
    btn.style.boxShadow = "0 " + (10 * lift).toFixed(1) + "px " + blur.toFixed(1) + "px rgba(8,6,12,.34)";
    floor.style.transform = "translate(" + (nx * 38).toFixed(1) + "px, " + (ny * 16).toFixed(1) + "px) scale(" + (1 + mag * 0.32).toFixed(2) + ")";
    floor.style.opacity = (0.16 + mag * 0.55).toFixed(2);
    const gx = (50 - nx * 32).toFixed(0);
    const gy = (50 - ny * 32).toFixed(0);
    glow.style.background = "radial-gradient(circle at " + gx + "% " + gy + "%, rgba(255,255,255," + (0.16 + mag * 0.42).toFixed(2) + "), rgba(255,255,255,0) 62%)";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(0.2, -0.2);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        const d = idleDrift(t);
        targetXRef.current = d[0];
        targetYRef.current = d[1];
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
  }

  function onClick(): void {
    setDemo(false);
    hasPointerRef.current = true;
    targetXRef.current = 0;
    targetYRef.current = -0.9;
    if (reduce) render(targetXRef.current, targetYRef.current);
    window.setTimeout(() => {
      hasPointerRef.current = false;
    }, 260);
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

  const cls = [styles.id, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>주파수가 다른 사인파 둘을 더해 손을 떼도 버튼이 스스로 천천히 떠돕니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <span className={styles.floor} ref={floorRef} aria-hidden="true" />
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.glow} ref={glowRef} aria-hidden="true" />
            <span className={styles.label}>무료로 시작하기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
