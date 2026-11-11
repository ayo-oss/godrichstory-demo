import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StrokeDrawBadge.module.scss";

export type StrokeDrawBadgeProps = {
  label?: string;
  /** 한 바퀴(그리기→멈춤→지우기) 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BIT_DIRS: Array<[number, number]> = [
  [0, -2.6],
  [2.1, -1.4],
  [-2.1, -1.4],
];

export default function StrokeDrawBadge({
  label = "새 기능",
  duration = 600,
  easing = "ease-out",
  color = "#fff7e6",
}: StrokeDrawBadgeProps) {
  const starRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };

  // 한 겹: 펜 끝 추적 — getTotalLength 실측 + getPointAtLength 로 스파크를 옮기고
  // 이동 방향 뒤쪽으로 찌꺼기를 방출한다 (vanilla 데모와 동일 계산)
  useEffect(() => {
    const star = starRef.current, spark = sparkRef.current;
    if (!star || !spark || !star.getTotalLength) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = star.getTotalLength();
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prev: DOMPoint | null = null, lastEmit = 0, emitIdx = 0, raf = 0;
    const frame = (t: number) => {
      const off = parseFloat(getComputedStyle(star).strokeDashoffset) || 0;
      const at = off >= 0 ? 100 - off : -off;
      const p = star.getPointAtLength(Math.max(0, Math.min(100, at)) / 100 * L);
      if (prev && Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 0.05) {
        spark.setAttribute("cx", String(p.x));
        spark.setAttribute("cy", String(p.y));
        spark.style.opacity = "1";
        if (t - lastEmit > 50 && bits.length) {
          lastEmit = t;
          const ang = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI;
          const sp = 0.4 + Math.random() * 0.5;
          const b = bits[emitIdx++ % bits.length];
          b.setAttribute("cx", String(p.x));
          b.setAttribute("cy", String(p.y));
          b.style.setProperty("--dx", (Math.cos(ang) * sp * 6).toFixed(2) + "px");
          b.style.setProperty("--dy", (Math.sin(ang) * sp * 6).toFixed(2) + "px");
          b.style.setProperty("--spin", String(Math.round(Math.random() * 360)));
          b.style.animation = "none";
          void b.getBoundingClientRect();
          b.style.animation = "";
        }
        prev = p;
      } else {
        if (prev) spark.style.opacity = "0";
        if (!prev) prev = p;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <p className={styles.badge} style={vars}>
      <svg className={styles.badge__icon} viewBox="0 0 24 24" aria-hidden="true">
        <path
          className={styles.badge__trail}
          pathLength={100}
          d="M12 2l2.9 6.9L22 9.3l-5.5 4.8 1.6 7.1L12 17.5 5.9 21.2l1.6-7.1L2 9.3l7.1-.4z"
        />
        <path
          ref={starRef}
          className={styles.badge__star}
          pathLength={100}
          d="M12 2l2.9 6.9L22 9.3l-5.5 4.8 1.6 7.1L12 17.5 5.9 21.2l1.6-7.1L2 9.3l7.1-.4z"
        />
        <circle ref={sparkRef} className={styles.badge__spark} r={1} cx={0} cy={0} />
        {BIT_DIRS.map(([dx, dy], i) => (
          <circle
            key={i}
            ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
            className={styles.badge__bit}
            r={i === 0 ? 0.55 : 0.5}
            cx={12}
            cy={2}
            style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
          />
        ))}
      </svg>
      {label}
    </p>
  );
}
