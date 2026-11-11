import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import styles from "./ContentSlideUpCard.module.scss";

export type ContentSlideUpCardProps = {
  title: string;
  meta: string;
  /** 패널이 올라오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  media?: ReactNode;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ContentSlideUpCard({
  title,
  meta,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  media,
}: ContentSlideUpCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cardRef = useRef<HTMLElement>(null);

  // 커서 위치로 스포트라이트(--mx/--my/--sp) 와 미세 3D 틸트(--rx/--ry) 를 함께 만든다.
  const handlePointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    card.style.setProperty("--sp", "1");
    card.style.setProperty("--rx", `${-py * 8}deg`);
    card.style.setProperty("--ry", `${px * 9}deg`);
  }, []);

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--sp", "0");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <div className={styles.frame}>
      <article
        ref={cardRef}
        className={styles.card}
        style={vars}
        tabIndex={0}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <span className={styles.media} aria-hidden="true">{media}</span>
        <div className={styles.panel}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>{meta}</p>
        </div>
      </article>
    </div>
  );
}
