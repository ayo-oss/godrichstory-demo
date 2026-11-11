import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterDragHandle.module.scss";

export type BeforeAfterDragHandleProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };

/** 원형 핸들을 드래그하면 세로선이 실시간으로 따라온다. pointer capture 로 손이 빠르게 움직여도 안 놓친다. */
export default function BeforeAfterDragHandle({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: BeforeAfterDragHandleProps) {
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

  const onDown = useCallback((e: PointerEvent<HTMLSpanElement>) => {
    setDemo(false);
    dragging.current = true;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    setFromX(e.clientX);
  }, [setFromX]);
  const onMove = useCallback((e: PointerEvent<HTMLSpanElement>) => {
    if (dragging.current) setFromX(e.clientX);
  }, [setFromX]);
  const onUp = useCallback(() => { dragging.current = false; }, []);

  const vars: Vars = { "--reveal": `${reveal}%`, ["--duration" as string]: duration, ["--easing" as string]: easing, ["--color" as string]: color };

  return (
    <div ref={ref} className={demo ? `${styles.ba} ${styles.isDemo}` : styles.ba} style={vars}>
      <div className={styles.after} />
      <div className={styles.before} />
      <div className={styles.handle}>
        <span
          className={styles.grip}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>
    </div>
  );
}
