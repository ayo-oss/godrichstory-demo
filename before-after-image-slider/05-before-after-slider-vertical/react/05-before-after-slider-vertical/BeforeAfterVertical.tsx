import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterVertical.module.scss";

export type BeforeAfterVerticalProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };

/** 경계선이 위아래로 움직인다. clip-path: inset(var(--reveal) 0 0 0) 로 위쪽 사진이 아래를 덮는다. */
export default function BeforeAfterVertical({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BeforeAfterVerticalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [demo, setDemo] = useState(true);
  const dragging = useRef(false);

  const setFromY = useCallback((y: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setReveal(Math.max(0, Math.min(100, ((y - r.top) / r.height) * 100)));
  }, []);

  const onDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setDemo(false);
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromY(e.clientY);
  }, [setFromY]);
  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => { if (dragging.current) setFromY(e.clientY); }, [setFromY]);
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
    >
      <div className={styles.after} />
      <div className={styles.before} />
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
