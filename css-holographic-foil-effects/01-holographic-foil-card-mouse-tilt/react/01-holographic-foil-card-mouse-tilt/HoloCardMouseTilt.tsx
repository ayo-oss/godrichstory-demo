import { useRef, type CSSProperties, type PointerEvent } from "react";
import styles from "./HoloCardMouseTilt.module.scss";

export type HoloCardMouseTiltProps = {
  badge: string;
  title: string;
  /** 기울기·시프트가 전환되는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 카드 뒷면 그라디언트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** pointermove 로 --mx/--my/--rx/--ry 를 직접 놓는다 — :hover 만으로는 커서 좌표를 못 읽는다 */
export default function HoloCardMouseTilt({
  badge,
  title,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: HoloCardMouseTiltProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", `${mx}%`);
    el.style.setProperty("--my", `${my}%`);
    el.style.setProperty("--rx", `${(my / 100 - 0.5) * -14}deg`);
    el.style.setProperty("--ry", `${(mx / 100 - 0.5) * 14}deg`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <article
      ref={ref}
      className={styles.card}
      style={vars}
      tabIndex={0}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <div className={styles.shine} aria-hidden="true" />
      <div className={styles.body}>
        <span className={styles.badge}>{badge}</span>
        <h3 className={styles.title}>{title}</h3>
      </div>
    </article>
  );
}
