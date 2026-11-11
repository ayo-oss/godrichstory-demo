// TerrainPanorama — vanilla 판(run/290/demo/07-pointer-3d-terrain-panorama/index.html) 의 React 포트.
// 겹마다 다른 이동 계수(--depth)는 CSS 가 갖고 있고, 여기서는 포인터 x 를 -1~1 로 바꾼 값(--px) 하나만 넘긴다.
// 그 한 값이 requestAnimationFrame 루프에서 0.12 씩 목표로 다가가므로 겹이 관성 있게 따라온다.
// 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./TerrainPanorama.module.scss";

export type TerrainPanoramaProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 키보드 이벤트에서 실제로 쓰는 두 가지만 적는다
type KeyEvt = { key: string; preventDefault(): void };

const WINDOW_LABEL = "하늘, 산, 들판 세 겹이 마우스를 따라 서로 다른 거리로 움직이는 풍경";
const CAPTION = "제주 남쪽 오름";
const HINT = "마우스를 좌우로 옮기면 겹이 갈라집니다";

function clampAim(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export default function TerrainPanorama({
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: TerrainPanoramaProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const aimRef = useRef<number>(0) as Box<number>;
  const nowRef = useRef<number>(0) as Box<number>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const rafRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 함수 선언이라 자기 이름을 안전하게 다시 부른다 — 프레임마다 목표까지 남은 거리의 12% 를 좁힌다
  function step(): void {
    const frame = frameRef.current;
    if (!frame) {
      runningRef.current = false;
      return;
    }
    nowRef.current += (aimRef.current - nowRef.current) * 0.12;
    frame.style.setProperty("--px", nowRef.current.toFixed(3));
    if (Math.abs(aimRef.current - nowRef.current) < 0.002) {
      frame.style.setProperty("--px", aimRef.current.toFixed(3));
      runningRef.current = false;
      return;
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function start(): void {
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(step);
    }
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const frame = frameRef.current;
    if (!frame) return;
    setDemo(false);
    const r = frame.getBoundingClientRect();
    aimRef.current = clampAim(((event.clientX - r.left) / r.width) * 2 - 1);
    start();
  }

  function onPointerLeave(): void {
    aimRef.current = 0;
    start();
  }

  // 키보드 경로: 좌우 화살표로 같은 범위를 0.25씩 움직인다
  function onKeyDown(event: KeyEvt): void {
    const move = event.key === "ArrowLeft" ? -0.25 : event.key === "ArrowRight" ? 0.25 : 0;
    if (!move) return;
    event.preventDefault();
    setDemo(false);
    aimRef.current = clampAim(aimRef.current + move);
    start();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.window}
          ref={frameRef}
          role="img"
          aria-label={WINDOW_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <span className={`${styles.layer} ${styles.layerSky}`} aria-hidden="true">
            <span className={styles.sun}></span>
          </span>
          <span className={`${styles.layer} ${styles.layerHill}`} aria-hidden="true">
            <i className={`${styles.peak} ${styles.peakL}`}></i>
            <i className={`${styles.peak} ${styles.peakR}`}></i>
          </span>
          <span className={`${styles.layer} ${styles.layerField}`} aria-hidden="true"></span>
          <span className={styles.caption}>{CAPTION}</span>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
