import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterLabels.module.scss";

export type BeforeAfterLabelsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string; "--revealNum"?: string };

/** BEFORE·AFTER 알약 배지가 경계선 위치에 맞춰 opacity 로 옅어지고 짙어진다. */
export default function BeforeAfterLabels({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: BeforeAfterLabelsProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [demo, setDemo] = useState(true);
  const dragging = useRef(false);

  const setFromX = useCallback((x: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setReveal(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
  }, []);

  const onDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setDemo(false);
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  }, [setFromX]);
  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => { if (dragging.current) setFromX(e.clientX); }, [setFromX]);
  const onUp = useCallback(() => { dragging.current = false; }, []);

  const vars: Vars = {
    "--reveal": `${reveal}%`,
    "--revealNum": (reveal / 100).toFixed(3),
    ["--duration" as string]: duration,
    ["--easing" as string]: easing,
    ["--color" as string]: color,
  };

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
      <span className={`${styles.badge} ${styles.badgeBefore}`}>BEFORE</span>
      <span className={`${styles.badge} ${styles.badgeAfter}`}>AFTER</span>
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
