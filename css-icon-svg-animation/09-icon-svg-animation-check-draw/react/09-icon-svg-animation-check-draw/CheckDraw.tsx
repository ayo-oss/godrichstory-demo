import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CheckDraw.module.scss";

export type CheckDrawProps = {
  label?: string;
  /** 한 바퀴(그리기→멈춤→지우기) 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const BIT_DIRS: Array<[number, number]> = [
  [-1.8, 1.4],
  [-1.2, -1.8],
  [1.4, -1.6],
];

export default function CheckDraw({
  label = "저장 완료",
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: CheckDrawProps) {
  const checkRef = useRef<SVGPolylineElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };

  // 한 겹: 펜 끝 추적 — getTotalLength 실측 + getPointAtLength 로 스파크를 옮기고
  // 진행 반대 방향으로 찌꺼기를 뿌린다. 지워지는 구간(offset<0)은 시작점 쪽 경계를 따른다
  // (vanilla 데모와 동일 계산)
  useEffect(() => {
    const check = checkRef.current, spark = sparkRef.current;
    if (!check || !spark || !check.getTotalLength) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = check.getTotalLength();
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prev: DOMPoint | null = null, lastEmit = 0, emitIdx = 0, raf = 0;

    const frame = (t: number) => {
      const off = parseFloat(getComputedStyle(check).strokeDashoffset) || 0;
      const at = off >= 0 ? 100 - off : -off;
      const p = check.getPointAtLength(Math.max(0, Math.min(100, at)) / 100 * L);
      if (prev && Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 0.05) {
        spark.setAttribute("cx", String(p.x));
        spark.setAttribute("cy", String(p.y));
        spark.style.opacity = "1";
        if (t - lastEmit > 40 && bits.length) {   // 체크는 짧아서 방출 간격도 짧게
          lastEmit = t;
          const ang = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI;
          const sp = 0.4 + Math.random() * 0.5;
          const b = bits[emitIdx++ % bits.length];
          b.setAttribute("cx", String(p.x));
          b.setAttribute("cy", String(p.y));
          b.style.setProperty("--dx", (Math.cos(ang) * sp * 4).toFixed(2) + "px");
          b.style.setProperty("--dy", (Math.sin(ang) * sp * 4).toFixed(2) + "px");
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
    <p className={styles.confirm} style={vars}>
      <svg className={styles.confirm__icon} viewBox="0 0 24 24" width="64" height="64" aria-hidden="true">
        <circle cx="12" cy={12} r={10} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.35} />
        <polyline
          className={styles.confirm__trail}
          points="7 12.5 10.5 16 17 8.5"
          pathLength={100}
          fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
        />
        <polyline
          ref={checkRef}
          className={styles.confirm__check}
          points="7 12.5 10.5 16 17 8.5"
          pathLength={100}
          fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
        />
        <circle ref={sparkRef} className={styles.confirm__spark} r={1} cx={7} cy={12.5} />
        {BIT_DIRS.map(([dx, dy], i) => (
          <circle
            key={i}
            ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
            className={styles.confirm__bit}
            r={i === 0 ? 0.6 : 0.5}
            cx={7}
            cy={12.5}
            style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
          />
        ))}
      </svg>
      {label}
    </p>
  );
}
