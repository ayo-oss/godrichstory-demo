import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./IconBounceCard.module.scss";

export type IconBounceCardProps = {
  title: string;
  meta: string;
  /** 한 번 튀어오르는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 아이콘 배지 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IconBounceCard({
  title,
  meta,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: IconBounceCardProps) {
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
        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>{meta}</p>
        </div>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>
      </article>
    </div>
  );
}
