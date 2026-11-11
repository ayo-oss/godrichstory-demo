// CardStackParallax — vanilla 판(run/290/demo/02-pointer-3d-card-stack-parallax/index.html) 의 React 포트.
// 깊이 계수는 CSS 가 카드마다 --shift 로 갖고 있고, 훅은 -1~1 한 값(--px)만 장면에 넘긴다.
// 감쇠 0.16 으로 목표를 따라가고 차이가 0.002 미만이면 목표 값으로 딱 맞춰 멈춘다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./CardStackParallax.module.scss";

export type CardStackParallaxProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 의 KeyboardEvent 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

const SCENE_LABEL = "깊이가 다른 카드 석 장이 마우스를 따라 어긋나는 모형";
const KEY_STEP = 0.25; // 키보드 경로: 좌우 화살표로 같은 범위를 0.25씩 움직인다

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function CardStackParallax({
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: CardStackParallaxProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const aimRef = useRef<number>(0) as Box<number>;
  const nowRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  function step(): void {
    const scene = sceneRef.current;
    if (!scene) {
      runningRef.current = false;
      return;
    }
    nowRef.current += (aimRef.current - nowRef.current) * 0.16;
    scene.style.setProperty("--px", nowRef.current.toFixed(3));
    if (Math.abs(aimRef.current - nowRef.current) < 0.002) {
      scene.style.setProperty("--px", aimRef.current.toFixed(3));
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
    aimRef.current = clamp(nx, -1, 1);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    aimFrom(event);
    start();
  }

  function onPointerLeave(): void {
    aimRef.current = 0;
    start();
  }

  function onKeyDown(event: KeyEvt): void {
    const move = event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowRight" ? KEY_STEP : 0;
    if (!move) return;
    event.preventDefault();
    setDemo(false);
    aimRef.current = clamp(aimRef.current + move, -1, 1);
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
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <div className={`${styles.card} ${styles.cardBack}`}>
            <span className={styles.tag}>팀</span>
            <span className={styles.gloss} aria-hidden="true"></span>
          </div>
          <div className={`${styles.card} ${styles.cardMid}`}>
            <span className={styles.tag}>프로</span>
            <span className={styles.gloss} aria-hidden="true"></span>
          </div>
          <div className={`${styles.card} ${styles.cardFront}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="m224 96l-96 56l-96-56l96-56Z" opacity=".2"/><path d="M232.4 114.49L128 174.06l-104.4-59.57a8 8 0 0 0-7.94 13.88l108.36 61.85a8 8 0 0 0 7.94 0l108.4-61.85a8 8 0 0 0-8-13.88ZM24 89.9l100.36 57.28a8 8 0 0 0 7.94 0L232.4 89.9a16 16 0 0 0 0-27.79L131.94 4.87a8 8 0 0 0-7.88 0L24 62.11a16 16 0 0 0 0 27.79Zm104-69l96.06 54.85L128 130.61L31.94 75.75Z"/></g></svg>
            <span className={`${styles.tag} ${styles.tagLead}`}>기본</span>
            <span className={styles.gloss} aria-hidden="true"></span>
          </div>
        </div>
        <p className={styles.hint}>마우스를 좌우로 옮겨 보세요</p>
      </div>
    </main>
  );
}
