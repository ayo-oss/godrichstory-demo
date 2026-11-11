// AlphaCheckerboard — vanilla 판(run/286/demo/04-color-picker-alpha-checkerboard) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 alpha 숫자 하나뿐이다. 손잡이 위치도, 미리보기 사각형의 불투명도도, 옆의 숫자도
// 전부 --a 한 값에서 나오고 숫자는 module.scss 의 counter-set 이 찍는다 — JS 가 글자를 쓰지 않는다.
import { useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./AlphaCheckerboard.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

export type AlphaCheckerboardProps = {
  trackLabel?: string;
  capLabel?: string;
  noteLabel?: string;
  /** "투명도 %a%" 처럼 자리표시자 하나를 가진 틀 */
  alphaFormat?: string;
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
  "--a"?: number;
};

export default function AlphaCheckerboard({
  trackLabel = "투명도 고르기",
  capLabel = "투명도",
  noteLabel = "칸무늬 위 미리보기",
  alphaFormat = "투명도 %a%",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: AlphaCheckerboardProps) {
  const [live, setLive] = useState(demo);
  const [alpha, setAlpha] = useState(100);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--a": alpha,
  };

  function alphaAt(e: ReactPointerEvent<HTMLDivElement>): number {
    const box = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    return Math.round(t * 100);
  }

  function start(e: ReactPointerEvent<HTMLDivElement>) {
    setLive(false);
    e.currentTarget.setPointerCapture(e.pointerId);   // 띠 밖으로 끌어도 계속 포인터를 받는다
    setAlpha(alphaAt(e));
  }

  function drag(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) setAlpha(alphaAt(e));
  }

  function press(e: KeyEvt) {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") setAlpha(Math.min(100, alpha + step));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setAlpha(Math.max(0, alpha - step));
    else return;
    e.preventDefault();
    setLive(false);
  }

  const alphaText = alphaFormat.replace("%a", String(alpha));

  return (
    <div className={[styles.al, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <p className={styles.head} aria-hidden="true">
        <span className={styles.cap}>{capLabel}</span>
        <span className={styles.val} />
      </p>
      <div
        className={styles.track}
        role="slider"
        tabIndex={0}
        aria-label={trackLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={alpha}
        aria-valuetext={alphaText}
        onPointerDown={start}
        onPointerMove={drag}
        onKeyDown={press}
      >
        <span className={styles.knob} aria-hidden="true" />
      </div>
      <p className={styles.note} aria-hidden="true">
        {noteLabel}
      </p>
      <div className={styles.preview} aria-hidden="true">
        <span className={styles.fill} />
      </div>
    </div>
  );
}
