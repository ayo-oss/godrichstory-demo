// TextLayers3D — vanilla 판(run/290/demo/05-pointer-3d-text-layers/index.html) 의 React 포트.
// 포인터 좌표를 rotateX ±10도 · rotateY ±18도 로 바꿔 묶음에 주고, 목표값까지 프레임마다 14% 씩 다가간다.
// 목표에 0.04도 안으로 붙으면 루프를 끊어 idle 프레임을 돌리지 않는다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./TextLayers3D.module.scss";

export type TextLayers3DProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type Tilt = { x: number; y: number };
// 키보드 이벤트는 ambient react 타입에 없다 — 쓰는 두 가지만 지역 타입으로 적는다
type KeyEvt = { key: string; preventDefault(): void };

const MAX_Y = 18;   // 미리보기 키프레임과 같은 범위
const MAX_X = 10;
const EASE_RATE = 0.14;
const STOP_AT = 0.04;
const KEY_STEP = 5;
const WORD = "LAYERS";
const SCENE_LABEL = "LAYERS 라는 글자가 다섯 겹으로 떠서 마우스를 따라 기우는 모형";
const HINT = "마우스를 옮기면 글자 층이 벌어집니다";

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

export default function TextLayers3D({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: TextLayers3DProps) {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const aimRef = useRef<Tilt>({ x: 0, y: 0 }) as Box<Tilt>;
  const nowRef = useRef<Tilt>({ x: 0, y: 0 }) as Box<Tilt>;
  const runningRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const step = useCallback((): void => {
    const aim = aimRef.current;
    const now = nowRef.current;
    now.x += (aim.x - now.x) * EASE_RATE;
    now.y += (aim.y - now.y) * EASE_RATE;
    const stack = stackRef.current;
    if (stack) {
      stack.style.transform = "rotateX(" + now.x.toFixed(2) + "deg) rotateY(" + now.y.toFixed(2) + "deg)";
    }
    if (Math.abs(aim.x - now.x) < STOP_AT && Math.abs(aim.y - now.y) < STOP_AT) {
      runningRef.current = false;
      return;
    }
    frameRef.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback((): void => {
    if (!runningRef.current) {
      runningRef.current = true;
      frameRef.current = requestAnimationFrame(step);
    }
  }, [step]);

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const r = event.currentTarget.getBoundingClientRect();
    aimRef.current.y = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1)) * MAX_Y;
    aimRef.current.x = Math.max(-1, Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1)) * -MAX_X;
    start();
  }

  function onPointerLeave(): void {
    aimRef.current.x = 0;
    aimRef.current.y = 0;
    start();
  }

  // 키보드 경로: 화살표로 5도씩 기울인다
  function onKeyDown(event: KeyEvt): void {
    const keys: { [key: string]: [number, number] } = {
      ArrowLeft: [0, -KEY_STEP],
      ArrowRight: [0, KEY_STEP],
      ArrowUp: [KEY_STEP, 0],
      ArrowDown: [-KEY_STEP, 0],
    };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    setDemo(false);
    aimRef.current.x = clamp(aimRef.current.x + move[0], MAX_X);
    aimRef.current.y = clamp(aimRef.current.y + move[1], MAX_Y);
    start();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.scene}
          role="img"
          aria-label={SCENE_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <div className={styles.stack} ref={stackRef}>
            <span className={styles.layer} aria-hidden="true">{WORD}</span>
            <span className={styles.layer} aria-hidden="true">{WORD}</span>
            <span className={styles.layer} aria-hidden="true">{WORD}</span>
            <span className={styles.layer} aria-hidden="true">{WORD}</span>
            <span className={`${styles.layer} ${styles.layerTop}`}>{WORD}</span>
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
