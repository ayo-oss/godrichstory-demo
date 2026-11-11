import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./GradientBorderCard.module.scss";

export type GradientBorderCardProps = {
  title: string;
  meta: string;
  /** 테두리가 나타나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 그라데이션 시작 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GradientBorderCard({
  title,
  meta,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: GradientBorderCardProps) {
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
      <span className={styles.border} aria-hidden="true" />
      <div className={styles.inner}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
