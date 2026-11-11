import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import styles from "./SpotlightCursorBg.module.scss";

export type SpotlightCursorBgProps = {
  children?: ReactNode;
  /** 궤도를 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 스포트라이트 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SpotlightCursorBg({
  children,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  className = "",
}: SpotlightCursorBgProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: -90, y: -40 });

  const move = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setDemo(false);
    setPos({ x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 });
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const t = demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)` };

  return (
    <div className={`${styles.stage} ${className}`} style={vars} onPointerMove={move}>
      <span className={demo ? `${styles.spot} ${styles.isDemo}` : styles.spot} style={t} aria-hidden="true" />
      {children}
    </div>
  );
}
