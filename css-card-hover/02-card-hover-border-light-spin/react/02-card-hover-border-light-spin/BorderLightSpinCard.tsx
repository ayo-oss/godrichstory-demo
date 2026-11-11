import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BorderLightSpinCard.module.scss";

export type BorderLightSpinCardProps = {
  title: string;
  meta: string;
  /** 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 빛 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BorderLightSpinCard({
  title,
  meta,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: BorderLightSpinCardProps) {
  const ref = useRef<HTMLElement>(null);

  // 커서 위치로 스포트라이트(--mx/--my/--sp)와 미세 3D 틸트(--rx/--ry)를 얹는다.
  const move = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    el.style.setProperty("--sp", "1");
    el.style.setProperty("--rx", `${-py * 6}deg`);
    el.style.setProperty("--ry", `${px * 7}deg`);
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
    <article
      ref={ref}
      className={styles.card}
      style={vars}
      tabIndex={0}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <span className={styles.ring} aria-hidden="true" />
      <div className={styles.inner}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
