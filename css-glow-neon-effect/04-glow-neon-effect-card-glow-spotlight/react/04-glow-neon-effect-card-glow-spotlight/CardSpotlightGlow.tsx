import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./CardSpotlightGlow.module.scss";

export type CardSpotlightGlowProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function CardSpotlightGlow({
  duration = 2000,
  easing = "ease-in-out",
  color = "#b36bff",
}: CardSpotlightGlowProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--y", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;

  return (
    <div ref={cardRef} className={styles.card} style={vars} onPointerMove={onPointerMove}>
      <span className={styles.thumb} aria-hidden="true" />
      <span className={`${styles.bar} ${styles.barLg}`} />
      <span className={`${styles.bar} ${styles.barSm}`} />
    </div>
  );
}
