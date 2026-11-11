import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterZoomSync.module.scss";

export type BeforeAfterZoomSyncProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string; "--zoom"?: string };
type WheelEv = { deltaY: number; preventDefault: () => void; [k: string]: any };

/** 휠을 굴리면 전·후 두 장이 같은 배율·중심점으로 함께 확대돼 세부 비교가 어긋나지 않는다. */
export default function BeforeAfterZoomSync({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BeforeAfterZoomSyncProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [zoom, setZoom] = useState(1);
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
  const onWheel = useCallback((e: WheelEv) => {
    setDemo(false);
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(2.2, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  }, []);

  const vars: Vars = {
    "--reveal": `${reveal}%`,
    "--zoom": zoom.toFixed(2),
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
      onWheel={onWheel}
    >
      <div className={styles.frame}>
        <div className={styles.after} />
        <div className={styles.before} />
      </div>
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
