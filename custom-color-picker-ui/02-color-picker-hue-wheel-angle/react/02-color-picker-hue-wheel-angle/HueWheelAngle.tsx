// HueWheelAngle — vanilla 판(run/286/demo/02-color-picker-hue-wheel-angle) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 hue 숫자 하나뿐이다. 손잡이 각도도, 가운데 원 색도, 아래 숫자도 전부 --h 한 값에서 나오고
// 숫자는 module.scss 의 counter-set 이 찍는다 — JS 가 글자를 쓰지 않는다.
import { useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./HueWheelAngle.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

export type HueWheelAngleProps = {
  wheelLabel?: string;
  capLabel?: string;
  /** "색상환 각도 %h도" 처럼 자리표시자 하나를 가진 틀 */
  hueFormat?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--h"?: number;
};

export default function HueWheelAngle({
  wheelLabel = "색상환에서 각도로 고르기",
  capLabel = "색상환 각도",
  hueFormat = "색상환 각도 %h도",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: HueWheelAngleProps) {
  const [live, setLive] = useState(demo);
  const [hue, setHue] = useState(212);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--h": hue,
  };

  // 중심에서 포인터까지의 각도를 잰다. Math.atan2 는 3시 방향이 0 이고 시계방향으로 커지는데,
  // conic-gradient(from 90deg) 도 빨강(색상 0)을 3시에 놓는다 — 기준이 같아 보정 없이 그대로 색상값이다
  function angleAt(e: ReactPointerEvent<HTMLDivElement>): number {
    const box = e.currentTarget.getBoundingClientRect();
    const deg =
      (Math.atan2(e.clientY - box.top - box.height / 2, e.clientX - box.left - box.width / 2) * 180) / Math.PI;
    return Math.round((deg + 360) % 360) % 360;
  }

  function start(e: ReactPointerEvent<HTMLDivElement>) {
    setLive(false);
    e.currentTarget.setPointerCapture(e.pointerId);   // 원 밖으로 끌어도 각도를 계속 받는다
    setHue(angleAt(e));
  }

  function drag(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) setHue(angleAt(e));
  }

  function press(e: KeyEvt) {
    const step = e.shiftKey ? 15 : 3;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") setHue((hue + step) % 360);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setHue((hue - step + 360) % 360);
    else return;
    e.preventDefault();
    setLive(false);
  }

  const hueText = hueFormat.replace("%h", String(hue));

  return (
    <div className={[styles.hw, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div
        className={styles.ring}
        role="slider"
        tabIndex={0}
        aria-label={wheelLabel}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hue}
        aria-valuetext={hueText}
        onPointerDown={start}
        onPointerMove={drag}
        onKeyDown={press}
      >
        <span className={styles.core} aria-hidden="true" />
        <span className={styles.arm} aria-hidden="true" />
      </div>
      <p className={styles.read} aria-hidden="true">
        <span className={styles.cap}>{capLabel}</span>
        <span className={styles.val} />
      </p>
    </div>
  );
}
