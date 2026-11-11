import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterTouchSwipe.module.scss";

export type BeforeAfterTouchSwipeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };

/** 슬라이더 전체가 터치 타깃이다. setPointerCapture 로 손가락이 밖으로 나가도 계속 따라온다. */
export default function BeforeAfterTouchSwipe({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: BeforeAfterTouchSwipeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [demo, setDemo] = useState(true);
  const dragging = useRef(false);

  const setFromX = useCallback((x: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((x - r.left) / r.width) * 100;
    setReveal(Math.max(0, Math.min(100, pct)));
  }, []);

  const onDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setDemo(false);
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  }, [setFromX]);
  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromX(e.clientX);
  }, [setFromX]);
  const onUp = useCallback(() => { dragging.current = false; }, []);

  const vars: Vars = { "--reveal": `${reveal}%`, ["--duration" as string]: duration, ["--easing" as string]: easing, ["--color" as string]: color };

  return (
    <div
      ref={ref}
      className={demo ? `${styles.ba} ${styles.isDemo}` : styles.ba}
      style={vars}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className={styles.after} />
      <div className={styles.before} />
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
