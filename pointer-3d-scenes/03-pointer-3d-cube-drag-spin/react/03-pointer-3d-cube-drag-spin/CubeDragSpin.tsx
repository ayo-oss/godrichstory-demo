// CubeDragSpin — vanilla 판(run/290/demo/03-pointer-3d-cube-drag-spin/index.html) 의 React 포트.
// 끄는 동안에는 드래그 거리(dx)에 0.55 를 곱해 각도를 바로 더하고, 놓은 뒤에는 남은 속도로 더 돌다가
// 90도 눈금 중 가장 가까운 쪽으로 당겨져 멈춘다(마찰 0.92 + 스냅 0.08). 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./CubeDragSpin.module.scss";

export type CubeDragSpinProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

const SCENE_LABEL = "여섯 면에 분류가 적힌 상자, 끌어서 돌린다";
const QUARTER = 90; // 키보드 경로: 좌우 화살표가 한 면씩(90도) 돌린다

export default function CubeDragSpin({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: CubeDragSpinProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef<number>(0) as Box<number>;
  const spinRef = useRef<number>(0) as Box<number>;
  const lastXRef = useRef<number>(0) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function paint(): void {
    const cube = cubeRef.current;
    if (!cube) return;
    cube.style.transform = "rotateX(-12deg) rotateY(" + angleRef.current.toFixed(2) + "deg)";
  }

  // 놓은 뒤에는 남은 속도로 더 돌다가(관성) 90도 눈금 중 가장 가까운 쪽으로 당겨져 멈춘다
  function step(): void {
    if (draggingRef.current) {
      runningRef.current = false;
      return;
    }
    const snap = Math.round(angleRef.current / QUARTER) * QUARTER;
    spinRef.current = spinRef.current * 0.92 + (snap - angleRef.current) * 0.08;
    angleRef.current += spinRef.current;
    paint();
    if (Math.abs(spinRef.current) < 0.05 && Math.abs(snap - angleRef.current) < 0.3) {
      angleRef.current = snap;
      paint();
      runningRef.current = false;
      return;
    }
    frameRef.current = requestAnimationFrame(step);
  }

  function start(): void {
    if (!runningRef.current) {
      runningRef.current = true;
      frameRef.current = requestAnimationFrame(step);
    }
  }

  useEffect(() => {
    function onWindowPointerUp(): void {
      if (draggingRef.current) {
        draggingRef.current = false;
        start();
      }
    }
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const scene = sceneRef.current;
    if (!scene) return;
    setDemo(false);
    draggingRef.current = true;
    lastXRef.current = event.clientX;
    spinRef.current = 0;
    scene.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!draggingRef.current) return;
    const dx = event.clientX - lastXRef.current;
    lastXRef.current = event.clientX;
    spinRef.current = dx * 0.55;
    angleRef.current += spinRef.current;
    paint();
  }

  function onKeyDown(event: KeyEvt): void {
    const turn = event.key === "ArrowLeft" ? -QUARTER : event.key === "ArrowRight" ? QUARTER : 0;
    if (!turn) return;
    event.preventDefault();
    setDemo(false);
    angleRef.current = Math.round(angleRef.current / QUARTER) * QUARTER + turn;
    paint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.scene}
          ref={sceneRef}
          role="img"
          aria-label={SCENE_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <div className={styles.cube} ref={cubeRef}>
            <div className={`${styles.face} ${styles.faceF}`}><span>사진</span></div>
            <div className={`${styles.face} ${styles.faceR}`}><span>영상</span></div>
            <div className={`${styles.face} ${styles.faceB}`}><span>글</span></div>
            <div className={`${styles.face} ${styles.faceL}`}><span>소리</span></div>
            <div className={`${styles.face} ${styles.faceU}`}></div>
            <div className={`${styles.face} ${styles.faceD}`}></div>
          </div>
        </div>
        <p className={styles.hint}>끌어서 돌리고 놓으면 가까운 면에서 멈춥니다</p>
      </div>
    </main>
  );
}
