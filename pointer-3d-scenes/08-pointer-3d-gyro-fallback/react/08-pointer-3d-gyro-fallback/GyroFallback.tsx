// GyroFallback — vanilla 판(run/290/demo/08-pointer-3d-gyro-fallback/index.html) 의 React 포트.
// 기울기 센서가 있으면 deviceorientation 의 beta·gamma 가, 없으면 포인터 좌표가 같은 각도(rotateX ±12도 · rotateY ±18도)를 만든다.
// 지금 무엇이 맡고 있는지를 라벨이 그때그때 보여 준다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./GyroFallback.module.scss";

export type GyroFallbackProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 기울기 이벤트와 키보드 이벤트에서 실제로 읽는 것만 적는다
type TiltEvt = { beta: number | null; gamma: number | null };
type KeyEvt = { key: string; preventDefault(): void };
type OrientationCtor = { requestPermission?: () => unknown };
type WindowWithOrientation = { DeviceOrientationEvent?: OrientationCtor };

const MOUSE_LABEL = "마우스가 맡는 중";
const TILT_LABEL = "기울기 센서가 맡는 중";
const PHONE_LABEL = "휴대폰 화면 속 카드가 기울기에 따라 도는 모형";
const FACE_LABEL = "기울여 보세요";
const HINT = "센서가 있으면 센서가, 없으면 마우스가 맡습니다";

const KEY_STEPS: { [key: string]: [number, number] } = {
  ArrowLeft: [0, -6],
  ArrowRight: [0, 6],
  ArrowUp: [6, 0],
  ArrowDown: [-6, 0],
};

// iOS 13+ 는 DeviceOrientationEvent.requestPermission 을 사람이 누른 뒤에만 준다 — 그 전까지는 마우스가 맡는다
function sensorReady(): boolean {
  const scope = window as unknown as WindowWithOrientation;
  return typeof scope.DeviceOrientationEvent !== "undefined" && typeof scope.DeviceOrientationEvent.requestPermission !== "function";
}

export default function GyroFallback({
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: GyroFallbackProps) {
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const keyXRef = useRef<number>(0) as Box<number>;
  const keyYRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [label, setLabel] = useState(MOUSE_LABEL);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function tilt(rx: number, ry: number, next: string): void {
    const card = cardRef.current;
    if (!card) return;
    setDemo(false);
    card.style.transform = "rotateX(" + rx.toFixed(1) + "deg) rotateY(" + ry.toFixed(1) + "deg)";
    setLabel(next);
  }

  useEffect(() => {
    if (!sensorReady()) return;
    function onOrientation(event: Event): void {
      const source = event as unknown as TiltEvt;
      const beta = source.beta === null ? 0 : source.beta; // 앞뒤 기울기
      const gamma = source.gamma === null ? 0 : source.gamma; // 좌우 기울기
      tilt(Math.max(-12, Math.min(12, (beta - 40) * 0.4)), Math.max(-18, Math.min(18, gamma * 0.6)), TILT_LABEL);
    }
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const phone = phoneRef.current;
    if (!phone) return;
    const r = phone.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1));
    tilt(-ny * 12, nx * 18, MOUSE_LABEL);
  }

  // 키보드 경로: 화살표가 기울기를 6도씩 준다
  function onKeyDown(event: KeyEvt): void {
    const move = KEY_STEPS[event.key];
    if (!move) return;
    event.preventDefault();
    keyXRef.current = Math.max(-12, Math.min(12, keyXRef.current + move[0]));
    keyYRef.current = Math.max(-18, Math.min(18, keyYRef.current + move[1]));
    tilt(keyXRef.current, keyYRef.current, MOUSE_LABEL);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.phone}
          ref={phoneRef}
          role="img"
          aria-label={PHONE_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <span className={styles.notch} aria-hidden="true"></span>
          <div className={styles.scene}>
            <div className={styles.card} ref={cardRef}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={styles.ico} aria-hidden="true"><g fill="currentColor"><path d="M176 24H80a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h96a16 16 0 0 0 16-16V40a16 16 0 0 0-16-16" opacity=".2"/><path d="M176 16H80a24 24 0 0 0-24 24v176a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40a24 24 0 0 0-24-24m8 200a8 8 0 0 1-8 8H80a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h96a8 8 0 0 1 8 8Z"/></g></svg>
              <span className={styles.face}>{FACE_LABEL}</span>
            </div>
          </div>
        </div>
        <p className={styles.badge}>
          {demo ? (
            <>
              <span className={`${styles.mode} ${styles.modeMouse}`}>{MOUSE_LABEL}</span>
              <span className={`${styles.mode} ${styles.modeTilt}`}>{TILT_LABEL}</span>
            </>
          ) : (
            label
          )}
        </p>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
