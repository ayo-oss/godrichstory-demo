// ProductRotate3D — vanilla 판(run/290/demo/01-pointer-3d-product-rotate/index.html) 의 React 포트.
// 포인터 좌표를 -1~1 로 정규화해 목표 각도(aim)를 만들고, 감쇠 추적으로 현재 각도(now)를 따라가게 한다.
// 목표로 당기는 힘 0.18 과 마찰 0.76 이 관성과 스프링 복귀를 한 식으로 처리한다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ProductRotate3D.module.scss";

export type ProductRotate3DProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

const MAX_Y = 16; // 미리보기 루프의 키프레임과 같은 범위
const MAX_X = 6;
const SCENE_LABEL = "마우스를 따라 좌우로 도는 상자 모형";
// 키보드 경로: 화살표로 4도씩 돌린다 (포인터가 없는 사람도 같은 각도를 볼 수 있게)
const KEY_MOVES: { [key: string]: [number, number] } = {
  ArrowLeft: [0, -4],
  ArrowRight: [0, 4],
  ArrowUp: [4, 0],
  ArrowDown: [-4, 0],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function ProductRotate3D({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: ProductRotate3DProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);
  const aimXRef = useRef<number>(0) as Box<number>; // 포인터가 요구하는 각도
  const aimYRef = useRef<number>(0) as Box<number>;
  const nowXRef = useRef<number>(0) as Box<number>;
  const nowYRef = useRef<number>(0) as Box<number>;
  const velXRef = useRef<number>(0) as Box<number>;
  const velYRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const holdingRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // 감쇠 추적: 목표로 당기는 힘(stiffness)과 마찰(damping)로 관성과 스프링 복귀를 한 식으로 처리한다
  function step(): void {
    velXRef.current = (velXRef.current + (aimXRef.current - nowXRef.current) * 0.18) * 0.76;
    velYRef.current = (velYRef.current + (aimYRef.current - nowYRef.current) * 0.18) * 0.76;
    nowXRef.current += velXRef.current;
    nowYRef.current += velYRef.current;
    const model = modelRef.current;
    if (model) {
      model.style.transform =
        "rotateX(" + nowXRef.current.toFixed(2) + "deg) rotateY(" + nowYRef.current.toFixed(2) + "deg)";
    }
    const resting =
      Math.abs(velXRef.current) < 0.01 &&
      Math.abs(velYRef.current) < 0.01 &&
      Math.abs(aimXRef.current - nowXRef.current) < 0.05 &&
      Math.abs(aimYRef.current - nowYRef.current) < 0.05;
    if (resting && !holdingRef.current) {
      runningRef.current = false;
      return;
    }
    frameRef.current = requestAnimationFrame(step);
  }

  function start(): void {
    if (runningRef.current) return;
    runningRef.current = true;
    frameRef.current = requestAnimationFrame(step);
  }

  function aimFrom(event: ReactPointerEvent<HTMLDivElement>): void {
    const scene = sceneRef.current;
    if (!scene) return;
    const r = scene.getBoundingClientRect();
    const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((event.clientY - r.top) / r.height) * 2 - 1;
    aimYRef.current = clamp(nx, -1, 1) * MAX_Y;
    aimXRef.current = clamp(ny, -1, 1) * -MAX_X;
  }

  function onPointerEnter(): void {
    setDemo(false);
    holdingRef.current = true;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    holdingRef.current = true;
    aimFrom(event);
    start();
  }

  function onPointerLeave(): void {
    holdingRef.current = false;
    aimXRef.current = 0;
    aimYRef.current = 0;
    start();
  }

  function onKeyDown(event: KeyEvt): void {
    const move = KEY_MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    setDemo(false);
    holdingRef.current = true;
    aimXRef.current = clamp(aimXRef.current + move[0], -MAX_X, MAX_X);
    aimYRef.current = clamp(aimYRef.current + move[1], -MAX_Y, MAX_Y);
    start();
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
          onPointerEnter={onPointerEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <div className={styles.model} ref={modelRef}>
            <div className={`${styles.face} ${styles.faceFront}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M128 129.09V232a8 8 0 0 1-3.84-1l-88-48.16a8 8 0 0 1-4.16-7V80.2a8 8 0 0 1 .7-3.27Z" opacity=".2"/><path d="m223.68 66.15l-88-48.15a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03M128 32l80.34 44L128 120L47.66 76ZM40 90l80 43.78v85.79l-80-43.75Zm96 129.57v-85.75L216 90v85.78Z"/></g></svg>
              <span className={styles.name}>원두 한 봉지</span>
            </div>
            <div className={`${styles.face} ${styles.faceSide}`}><span className={styles.side}>250 g</span></div>
            <div className={`${styles.face} ${styles.faceTop}`}></div>
          </div>
          <span className={styles.floor} aria-hidden="true"></span>
        </div>
        <p className={styles.hint}>마우스를 올려 돌려 보세요</p>
      </div>
    </main>
  );
}
