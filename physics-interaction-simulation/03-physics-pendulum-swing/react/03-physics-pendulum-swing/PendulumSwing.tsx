// PendulumSwing — vanilla 판(run/292/demo/03-physics-pendulum-swing/index.html) 의 React 포트.
// 각가속도 = -(G/LEN)·sin(각도) - DAMP·각속도 의 준암시적 오일러 적분. 각도가 곧 위치에너지다.
// 추를 잡고 있는 동안에는 포인터 각도를 그대로 쓰고, 놓는 순간의 각도에서 진동이 시작된다.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PendulumSwing.module.scss";

export type PendulumSwingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

// G 는 px/s² 로 02 중력 드롭과 같은 눈금이고 RAD 는 도 변환 상수다.
// -(g/L)sinθ 는 라디안/s² 이라 도 단위인 angle·avel 에 그대로 더하면 57배 작아진다 —
// 그 상태로는 30도에서 놓아도 6초에 0.9도밖에 안 움직여 추가 멈춰 있는 것처럼 보인다
const G = 1800;
const LEN = 118;
const DAMP = 0.4;
const RAD = 180 / Math.PI;
const JUMP = 15;    // 방향키 한 번에 더하는 각도
const LIMIT = 75;   // 잡아 당길 수 있는 최대 각도
const FIELD_LABEL = "진자 실험판";

export default function PendulumSwing({
  duration = 2000,
  easing = "ease-in-out",
  color = "#ff4d1f",
}: PendulumSwingProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const armRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef<number>(0) as Box<number>;
  const avelRef = useRef<number>(0) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const lastRef = useRef<number>(0) as Box<number>;
  const rafRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const shownRef = useRef<number>(0) as Box<number>;   // 화면에 찍힌 각도 — 같은 값이면 다시 그리지 않는다
  const [shown, setShown] = useState(0);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paint(): void {
    const arm = armRef.current;
    if (arm) arm.style.transform = "rotate(" + angleRef.current.toFixed(2) + "deg)";
    const deg = Math.round(Math.abs(angleRef.current));
    if (shownRef.current !== deg) { shownRef.current = deg; setShown(deg); }
  }

  function step(now: number): void {
    const dt = Math.min((now - lastRef.current) / 1000, 0.033);
    lastRef.current = now;
    // 각가속도 = -(g/L)·sinθ - 감쇠. 각도가 높이(에너지)로 바뀌는 게 진자의 물리다
    avelRef.current += (-(G / LEN) * Math.sin(angleRef.current / RAD) * RAD - DAMP * avelRef.current) * dt;
    angleRef.current += avelRef.current * dt;
    paint();
    if (Math.abs(angleRef.current) < 0.2 && Math.abs(avelRef.current) < 0.6) {
      angleRef.current = 0; avelRef.current = 0;
      paint();
      runningRef.current = false;
      return;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function start(): void {
    setDemo(false);
    if (reduced()) { angleRef.current = 0; avelRef.current = 0; paint(); return; }
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  function angleFromEvent(event: ReactPointerEvent<HTMLButtonElement>): number {
    const field = fieldRef.current;
    if (!field) return angleRef.current;
    const r = field.getBoundingClientRect();
    const px = event.clientX - (r.left + r.width / 2);
    const py = event.clientY - r.top;
    const deg = (Math.atan2(px, py) * 180) / Math.PI;
    return Math.max(-LIMIT, Math.min(LIMIT, deg));
  }

  useEffect(() => {
    paint();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function onBobPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
    event.preventDefault();
    draggingRef.current = true;
    setDemo(false);
    angleRef.current = angleFromEvent(event);
    avelRef.current = 0;
    paint();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onBobPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (!draggingRef.current) return;
    angleRef.current = angleFromEvent(event);
    avelRef.current = 0;
    paint();
  }

  function onBobPointerUp(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (reduced()) { angleRef.current = 0; avelRef.current = 0; paint(); return; }
    // 놓는 순간의 각도가 위치에너지 — 여기서부터 진동이 시작된다
    if (!runningRef.current) {
      runningRef.current = true;
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
  }

  function onKeyDown(event: KeyEvt): void {
    if (event.key === "ArrowLeft") angleRef.current = Math.max(-LIMIT, angleRef.current - JUMP);
    else if (event.key === "ArrowRight") angleRef.current = Math.min(LIMIT, angleRef.current + JUMP);
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); start(); return; }
    else return;
    event.preventDefault();
    setDemo(false);
    avelRef.current = 0;
    paint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-grab" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 108v44a80 80 0 0 1-160 0v-12a20 20 0 0 1 20-20h20V92a20 20 0 0 1 40 0a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M188 80a27.8 27.8 0 0 0-13.36 3.4a28 28 0 0 0-46.64-11A28 28 0 0 0 80 92v20H68a28 28 0 0 0-28 28v12a88 88 0 0 0 176 0v-44a28 28 0 0 0-28-28m12 72a72 72 0 0 1-144 0v-12a12 12 0 0 1 12-12h12v24a8 8 0 0 0 16 0V92a12 12 0 0 1 24 0v28a8 8 0 0 0 16 0V92a12 12 0 0 1 24 0v28a8 8 0 0 0 16 0v-12a12 12 0 0 1 24 0Z"/></g></symbol>
          <symbol id="ico-reset" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z" opacity=".2"/><path d="M232 136a104 104 0 1 1-38.17-80.55L208 60v-4a8 8 0 0 1 16 0v34a8 8 0 0 1-8 8h-34a8 8 0 0 1 0-16h7.6l-8.89-7.4A88 88 0 1 0 216 136a8 8 0 0 1 16 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-grab" /></svg>
          <span>추를 잡아 당겼다 놓으면 각도가 높이로 바뀌어 스스로 흔들립니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <span className={styles.pivot} aria-hidden="true"></span>
          <div className={styles.arm} ref={armRef}>
            <span className={styles.rod} aria-hidden="true"></span>
            <button
              className={styles.bob}
              type="button"
              aria-label="진자 추"
              onPointerDown={onBobPointerDown}
              onPointerMove={onBobPointerMove}
              onPointerUp={onBobPointerUp}
            >
              <svg className={styles.bobIco} aria-hidden="true"><use href="#ico-grab" /></svg>
            </button>
          </div>
          <p className={styles.angle} aria-live="polite">
            <span className={styles.angleVal}>{shown}도</span>
            <span className={styles.angleLoop} aria-hidden="true"><i>26도</i><i>0도</i><i>26도</i><i>0도</i></span>
          </p>
        </div>
        <div className={styles.bar}>
          <button
            className={styles.pull}
            type="button"
            onClick={() => { angleRef.current = 30; avelRef.current = 0; start(); }}
          >
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-grab" /></svg><span>30도에서 놓기</span>
          </button>
          <button
            className={styles.reset}
            type="button"
            onClick={() => { angleRef.current = 0; avelRef.current = 0; runningRef.current = false; paint(); }}
          >
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-reset" /></svg><span>멈추기</span>
          </button>
        </div>
      </div>
    </main>
  );
}
