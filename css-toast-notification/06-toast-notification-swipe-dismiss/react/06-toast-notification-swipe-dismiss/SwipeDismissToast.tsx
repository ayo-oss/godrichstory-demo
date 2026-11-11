import { useCallback, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SwipeDismissToast.module.scss";

export type SwipeDismissToastProps = {
  message: string;
  hint?: string;
  onDismiss?: (direction: "left" | "right") => void;
  /** 이 px 이상 밀면 닫힌다 (기본 80) */
  threshold?: number;
  duration?: number;
  color?: string;
};

type Vars = CSSProperties & { "--dx"?: string; "--color"?: string };

export default function SwipeDismissToast({
  message,
  hint = "밀어서 닫기",
  onDismiss,
  threshold = 80,
  duration = 220,
  color = "#17141a",
}: SwipeDismissToastProps) {
  const [dx, setDx] = useState(0);
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null);
  const x0 = useRef(0);
  const dragging = useRef(false);

  const onDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    x0.current = e.clientX;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setDx(e.clientX - (x0.current ?? 0));
  }, []);

  const onUp = useCallback(() => {
    dragging.current = false;
    if (Math.abs(dx) > threshold) {
      const dir = dx > 0 ? "right" : "left";
      setSwiped(dir);
      onDismiss?.(dir);
    } else {
      setDx(0);
    }
  }, [dx, threshold, onDismiss]);

  const vars: Vars = { "--dx": `${swiped ? 0 : dx}px`, "--color": color };

  return (
    <div
      className={`${styles.toast} ${swiped ? styles[swiped === "left" ? "swipedLeft" : "swipedRight"] : ""}`}
      style={vars}
      role="status"
      aria-live="polite"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <p className={styles.text}>{message}</p>
      <span className={styles.hint} aria-hidden="true">{hint}</span>
    </div>
  );
}
