import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RefreshSpin.module.scss";

export type RefreshSpinProps = {
  /** 한 바퀴 도는 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
  onRefresh?: () => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PATHS = [
  "M4 12a8 8 0 0 1 13.9-5.4",
  "M20 12a8 8 0 0 1-13.9 5.4",
  "M17.5 3.2v4.4h-4.4",
  "M6.5 20.8v-4.4h4.4",
];
const BIT_DIRS: Array<[number, number]> = [
  [0, -2.6],
  [2.1, -1.4],
  [-2.1, 1.4],
  [0, 2.6],
];
// 화살촉 끝 (뷰박스 좌표) — 회전축은 도형 중심 (12,12)
const TIP_A = { x: 17.9, y: 3.2 };
const TIP_B = { x: 6.1, y: 20.8 };

export default function RefreshSpin({
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
  onRefresh,
}: RefreshSpinProps) {
  const [spinning, setSpinning] = useState(false);
  const groupRef = useRef<SVGGElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 한 겹: 화살촉 스파크 + 미광 잔상 (vanilla 데모와 동일 계산) — 실측 회전각에서
  // 화살촉 좌표를 직접 계산해 스파크를 옮기고 접선 뒤쪽으로 찌꺼기를 뿌린다
  useEffect(() => {
    const g = groupRef.current, spark = sparkRef.current;
    if (!g || !spark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prev: number | null = null, lastEmit = 0, emitIdx = 0, raf = 0;
    const frame = (t: number) => {
      const tr = getComputedStyle(g).transform;
      const rad = tr && tr !== "none" ? Math.atan2(new DOMMatrixReadOnly(tr).b, new DOMMatrixReadOnly(tr).a) : 0;
      const moved = prev !== null && Math.abs(rad - prev) > 0.002;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const ax = 12 + (TIP_A.x - 12) * cos - (TIP_A.y - 12) * sin;
      const ay = 12 + (TIP_A.x - 12) * sin + (TIP_A.y - 12) * cos;
      spark.setAttribute("cx", ax.toFixed(2));
      spark.setAttribute("cy", ay.toFixed(2));
      spark.style.opacity = moved ? "1" : "0";
      if (moved && t - lastEmit > 70 && bits.length) {
        lastEmit = t;
        const up = Math.random() < 0.7;
        let px = ax, py = ay;
        if (!up) {
          px = 12 + (TIP_B.x - 12) * cos - (TIP_B.y - 12) * sin;
          py = 12 + (TIP_B.x - 12) * sin + (TIP_B.y - 12) * cos;
        }
        const back = rad + (up ? 0.5 * Math.PI : -0.5 * Math.PI) + Math.PI + (Math.random() - 0.5) * 1.2;
        const sp = 0.4 + Math.random() * 0.5;
        const b = bits[emitIdx++ % bits.length];
        b.setAttribute("cx", px.toFixed(2));
        b.setAttribute("cy", py.toFixed(2));
        b.style.setProperty("--dx", (Math.cos(back) * sp * 6).toFixed(2) + "px");
        b.style.setProperty("--dy", (Math.sin(back) * sp * 6).toFixed(2) + "px");
        b.style.animation = "none";
        void b.getBoundingClientRect();
        b.style.animation = "";
      }
      prev = rad;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <button
      type="button"
      className={styles.iconbtn}
      style={vars}
      aria-label="새로고침"
      onClick={() => {
        setSpinning(true);
        onRefresh?.();
      }}
    >
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <g className={styles["refresh-ghost"]}>
          {PATHS.map((d) => (
            <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          ))}
        </g>
        <g
          ref={groupRef}
          className={styles.refresh}
          data-spinning={spinning || undefined}
          onAnimationEnd={() => setSpinning(false)}
        >
          {PATHS.map((d) => (
            <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
        <circle ref={sparkRef} className={styles["refresh-spark"]} r={0.9} cx={17.9} cy={3.2} />
        {BIT_DIRS.map(([dx, dy], i) => (
          <circle
            key={i}
            ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
            className={styles["refresh-bit"]}
            r={i === 0 || i === 3 ? 0.5 : 0.45}
            cx={i < 2 ? 17.9 : 6.1}
            cy={i < 2 ? 3.2 : 20.8}
            style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
          />
        ))}
      </svg>
    </button>
  );
}
