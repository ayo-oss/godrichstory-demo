import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./SpotlightCard.module.scss";

export type SpotlightCardProps = {
  title: string;
  meta: string;
  /** 빛이 나타나는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 빛 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SpotlightCard({
  title,
  meta,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);

  const move = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--sp", "1");
    el.style.setProperty("--rx", `${-(py - 0.5) * 8}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
  }, []);

  const leave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--sp", "0");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article ref={ref} className={styles.card} style={vars} tabIndex={0} onPointerMove={move} onPointerLeave={leave}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.meta}>{meta}</p>
    </article>
  );
}
