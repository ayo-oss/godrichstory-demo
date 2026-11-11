// IsometricRoomSceneBuild — vanilla 판(run/333/demo/07-isometric-room-scene-build/index.html)
// 의 React 포트. 등각 세계 행렬은 한 번만 계산해 고정하고, 바닥 → 두 벽 → 지붕 순서로
// --d(지연)만 다르게 준 같은 transition 을 setInterval 토글로 반복 재생한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./IsometricRoomSceneBuild.module.scss";

export type IsometricRoomSceneBuildProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--d"?: string };
type Box<T> = { current: T };

const HINT = "바닥 → 두 벽 → 지붕 순서로 --d(지연) 값만 다르게 준 같은 transition 이 차례로 실행됩니다";
const ARIA_FIELD = "바닥 위에 두 벽이 서고 지붕이 닫히며 방이 조립되는 장면";
const LABEL_STEP = "조립 단계 ";

const DELAYS = { left: 0, right: 140, roof: 320 };

export default function IsometricRoomSceneBuild({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6"
}: IsometricRoomSceneBuildProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const stepRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const root = rootRef.current;
    if (!field || !root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      field.classList.add(styles.isOpen);
      if (stepRef.current) stepRef.current.textContent = "3";
      root.classList.add(styles.isStill);
      return;
    }

    function toggle(): void {
      if (!field) return;
      const open = field.classList.toggle(styles.isOpen);
      if (stepRef.current) stepRef.current.textContent = open ? "3" : "0";
    }
    timerRef.current = window.setInterval(toggle, 1400);
    return () => window.clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rb} ref={rootRef} data-duration={duration} data-easing={easing} data-color={color}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={ARIA_FIELD} tabIndex={0}>
          <div className={styles.floor}></div>
          <div className={styles.wallLeft} style={{ "--d": DELAYS.left + "ms" } as Vars}></div>
          <div className={styles.wallRight} style={{ "--d": DELAYS.right + "ms" } as Vars}></div>
          <div className={styles.roof} style={{ "--d": DELAYS.roof + "ms" } as Vars}></div>
        </div>
        <p className={styles.meta}>
          <span className={styles.metaLabel}>{LABEL_STEP}</span>
          <b className={styles.stepVal} ref={stepRef}>0</b>
          <span className={styles.metaUnit}>/3</span>
        </p>
      </div>
    </main>
  );
}
