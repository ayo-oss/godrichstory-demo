// SpecularSweepButton — vanilla 판(run/393/demo/02-pointer-tilt-3d-specular-sweep/index.html) 의 React 포트.
// 포인터와 중심의 각도(atan2)·거리 비율을 계산해 conic-gradient 광택 줄기의 각도·세기로 바꾼다.
// 각도는 최단 경로(shortest delta)로 lerp 해 360→0 경계에서 튀지 않는다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./SpecularSweepButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const SWEEP_WIDTH = 46; // 불변
const LERP = 0.2;
const LABEL = "프리미엄 결제 — 포인터 각도로 광택이 흐르는 버튼";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticAngle(t: number): number {
  return t * 74;
}
// 진폭을 넓혀 자동 시연에서도 기울기가 가장자리(최대 각)까지 실제로 닿게 한다(경로 상수만 조정)
function syntheticMag(t: number): number {
  return Math.min(1, 0.6 + 0.55 * Math.sin(t * 1.3));
}
function shortestDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export default function SpecularSweepButton() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const sweepRef = useRef<HTMLSpanElement | null>(null);
  const floorRef = useRef<HTMLSpanElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const targetAngleRef = useRef<number>(0) as Box<number>;
  const curAngleRef = useRef<number>(0) as Box<number>;
  const targetMagRef = useRef<number>(0) as Box<number>;
  const curMagRef = useRef<number>(0) as Box<number>;
  const hasPointerRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const t0Ref = useRef<number>(0) as Box<number>;
  const clickTimerRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(angle: number, mag: number): void {
    const btn = btnRef.current;
    const sweep = sweepRef.current;
    const floor = floorRef.current;
    const glow = glowRef.current;
    if (!btn || !sweep || !floor || !glow) return;
    const rotY = Math.cos((angle * Math.PI) / 180) * mag * 10;
    const rotX = Math.sin((angle * Math.PI) / 180) * mag * -10;
    btn.style.transform = "rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    const a0 = (angle - SWEEP_WIDTH / 2).toFixed(1);
    const alpha = (0.46 + mag * 0.54).toFixed(2);
    sweep.style.background =
      "conic-gradient(from " + a0 + "deg at 50% 50%, rgba(23,20,26,0), rgba(23,20,26," + alpha + ") " + (SWEEP_WIDTH / 2).toFixed(1) + "deg, rgba(23,20,26,0) " + SWEEP_WIDTH.toFixed(1) + "deg)";
    sweep.style.opacity = String(0.8 + mag * 0.4);
    const floorShift = Math.cos((angle * Math.PI) / 180) * mag * 34;
    const floorScale = 1 + mag * 0.28;
    floor.style.transform = "translateX(" + floorShift.toFixed(1) + "px) scaleX(" + floorScale.toFixed(2) + ")";
    floor.style.opacity = (0.08 + mag * 0.88).toFixed(2);
    const gx = (50 + Math.cos((angle * Math.PI) / 180) * mag * 38).toFixed(0);
    const gy = (50 + Math.sin((angle * Math.PI) / 180) * mag * 38).toFixed(0);
    glow.style.background = "radial-gradient(circle at " + gx + "% " + gy + "%, rgba(255,255,255," + (0.18 + mag * 0.5).toFixed(2) + "), rgba(255,255,255,0) 60%)";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(45, 0.4);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) / 1000;
      if (!hasPointerRef.current) {
        targetAngleRef.current = syntheticAngle(t) % 360;
        targetMagRef.current = syntheticMag(t);
      }
      curAngleRef.current += shortestDelta(curAngleRef.current, targetAngleRef.current) * LERP;
      curMagRef.current += (targetMagRef.current - curMagRef.current) * LERP;
      render(curAngleRef.current, curMagRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  function angleFromEvent(event: ReactPointerEvent<HTMLDivElement>): [number, number] {
    const scene = sceneRef.current;
    if (!scene) return [0, 0];
    const r = scene.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const mag = clamp(Math.sqrt(dx * dx + dy * dy) / (r.width / 2), 0, 1);
    return [ang, mag];
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    hasPointerRef.current = true;
    setDemo(false);
    const a = angleFromEvent(event);
    targetAngleRef.current = a[0];
    targetMagRef.current = a[1];
  }

  function onPointerLeave(): void {
    hasPointerRef.current = false;
    targetMagRef.current = 0.15;
  }

  function onClick(): void {
    setDemo(false);
    hasPointerRef.current = true;
    targetMagRef.current = 1;
    if (reduce) render(targetAngleRef.current, targetMagRef.current);
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      targetMagRef.current = hasPointerRef.current ? 0.5 : 0.15;
      if (reduce) render(targetAngleRef.current, targetMagRef.current);
    }, 220);
  }

  function onKeyDown(event: KeyEvt): void {
    const step = 18;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setDemo(false);
      hasPointerRef.current = true;
      targetAngleRef.current -= step;
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setDemo(false);
      hasPointerRef.current = true;
      targetAngleRef.current += step;
    } else {
      return;
    }
    if (reduce) render(targetAngleRef.current, targetMagRef.current);
  }

  const cls = [styles.ss, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.hint}>
          <span>포인터 각도를 계산해 광택 줄기가 그 방향으로 흐릅니다</span>
        </p>
        <div className={styles.scene} ref={sceneRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <span className={styles.glow} ref={glowRef} aria-hidden="true" />
          <span className={styles.floor} ref={floorRef} aria-hidden="true" />
          <button className={styles.btn} ref={btnRef} type="button" aria-label={LABEL} onClick={onClick} onKeyDown={onKeyDown}>
            <span className={styles.sweep} ref={sweepRef} aria-hidden="true" />
            <span className={styles.label}>프리미엄 결제</span>
          </button>
        </div>
      </div>
    </main>
  );
}
