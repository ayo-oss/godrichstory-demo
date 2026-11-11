import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterCaptionOverlay.module.scss";

export type BeforeAfterCaptionOverlayProps = {
  duration?: string;
  easing?: string;
  color?: string;
  caption?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };

/** 하단 그러데이션 띠 위에 캡션 글자가 얹혀, 무엇을 비교하는 사진인지 말로 설명한다. */
export default function BeforeAfterCaptionOverlay({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  caption = "3주 경과",
}: BeforeAfterCaptionOverlayProps) {
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
      <div className={styles.caption}>{caption}</div>
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
