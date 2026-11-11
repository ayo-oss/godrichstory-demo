import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./TiltParallaxCard.module.scss";

export type TiltParallaxCardProps = {
  title: string;
  meta: string;
  /** 기울기가 붙는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TiltParallaxCard({
  title,
  meta,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: TiltParallaxCardProps) {
  const ref = useRef<HTMLElement>(null);

  const move = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${-py * 14}deg`);
    el.style.setProperty("--ry", `${px * 16}deg`);
    el.style.setProperty("--pz", `${px * -12}px`);
    // 스포트라이트(커서 하이라이트) — 틸트는 그대로, 이 층만 얹는다
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    el.style.setProperty("--sp", "1");
  }, []);

  const leave = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); el.style.removeProperty("--pz");
      el.style.removeProperty("--mx"); el.style.removeProperty("--my"); el.style.removeProperty("--sp");
    }
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.frame}>
      <article
        ref={ref}
        className={styles.card}
        style={vars}
        tabIndex={0}
        onPointerMove={move}
        onPointerLeave={leave}
      >
        <span className={styles.back} aria-hidden="true" />
        <div className={styles.front}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>{meta}</p>
        </div>
      </article>
    </div>
  );
}
