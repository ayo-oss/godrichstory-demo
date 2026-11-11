import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./LogoReveal.module.scss";

export type LogoRevealProps = {
  wordmark?: string;
  /** 선이 그려지는 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BIT_DIRS: Array<[number, number]> = [
  [0, -2.4],
  [2, 0],
  [-2, 0],
];

export default function LogoReveal({
  wordmark = "GODRICH",
  duration = 600,
  easing = "ease-out",
  color = "#17141a",
}: LogoRevealProps) {
  const lineRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };

  // 한 겹: 펜 끝 추적 — getTotalLength 실측 + getPointAtLength 로 스파크를 옮기고
  // 이동 방향 뒤쪽으로 찌꺼기를 방출한다 (vanilla 데모와 동일 계산)
  useEffect(() => {
    const line = lineRef.current, spark = sparkRef.current;
    if (!line || !spark || !line.getTotalLength) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = line.getTotalLength();
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prev: DOMPoint | null = null, lastEmit = 0, emitIdx = 0, raf = 0;
    const frame = (t: number) => {
      const off = parseFloat(getComputedStyle(line).strokeDashoffset) || 0;
      const at = Math.max(0, Math.min(100, 100 - off));
      const p = line.getPointAtLength(at / 100 * L);
      if (prev && Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 0.05) {
        spark.setAttribute("cx", String(p.x));
        spark.setAttribute("cy", String(p.y));
        spark.style.opacity = "1";
        if (t - lastEmit > 60 && bits.length) {
          lastEmit = t;
          const ang = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI;
          const sp = 0.4 + Math.random() * 0.5;
          const b = bits[emitIdx++ % bits.length];
          b.setAttribute("cx", String(p.x));
          b.setAttribute("cy", String(p.y));
          b.style.setProperty("--dx", (Math.cos(ang) * sp * 5).toFixed(2) + "px");
          b.style.setProperty("--dy", (Math.sin(ang) * sp * 5).toFixed(2) + "px");
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
    <p className={styles.mark} style={vars}>
      <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
        <path className={styles.mark__fill} d="M12 3L21 12L12 21L3 12Z" />
        <path className={styles.mark__trail} pathLength={100} d="M12 3L21 12L12 21L3 12Z" />
        <path ref={lineRef} className={styles.mark__line} pathLength={100} d="M12 3L21 12L12 21L3 12Z" />
        <circle ref={sparkRef} className={styles.mark__spark} r={1} cx={12} cy={3} />
        {BIT_DIRS.map(([dx, dy], i) => (
          <circle
            key={i}
            ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
            className={styles.mark__bit}
            r={i === 0 ? 0.5 : 0.45}
            cx={12}
            cy={3}
            style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
          />
        ))}
      </svg>
      {wordmark}
    </p>
  );
}
