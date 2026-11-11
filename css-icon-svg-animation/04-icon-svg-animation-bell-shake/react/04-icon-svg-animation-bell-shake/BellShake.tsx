import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BellShake.module.scss";

export type BellShakeProps = {
  count?: number;
  /** 흔들리는 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
  onClick?: () => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Box<T> = { current: T };

const BIT_DIRS: Array<[number, number]> = [
  [0, -2.2],
  [2, 0],
  [-2, 0],
];

export default function BellShake({
  count = 3,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  onClick,
}: BellShakeProps) {
  const orbitRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as Box<Array<SVGCircleElement | null>>;
  const bellRef = useRef<SVGGElement>(null);

  // 한 겹: 종 밑단을 내닫는 스파크 — 종의 실제 회전각(getComputedStyle transform 행렬)을
  // 매 프레임 읽어 ±8° 를 받침 라인 0..1 진행도로 사상한다 (vanilla 데모와 동일 계산).
  // CSS 애니메이션과 물리적으로 동기라 트리거 방식(data-shaking·데모 루프)과 무관하다.
  useEffect(() => {
    const bell = bellRef.current, orbit = orbitRef.current, spark = sparkRef.current;
    if (!bell || !orbit || !spark || !orbit.getTotalLength) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = orbit.getTotalLength();
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prevA: number | null = null, prevP: DOMPoint | null = null, lastEmit = 0, emitIdx = 0, raf = 0;
    const angle = () => {   // 종의 현재 회전각(도) — transform 이 none 이면 0
      const tr = getComputedStyle(bell).transform;
      if (!tr || tr === "none") return 0;
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const v = m[1].split(",").map(parseFloat);
      return Math.atan2(v[1], v[0]) * 180 / Math.PI;
    };
    const frame = (t: number) => {
      const a = angle();
      if (prevA !== null) {
        if (Math.abs(a - prevA) > 0.05) {          // 종이 움직이는 동안만
          orbit.style.opacity = "0.4";             // 잔상 켬 (transition 이 부드럽게)
          const u = Math.max(0, Math.min(1, 0.5 + a / 16));   // ±8° → 0..1
          const p = orbit.getPointAtLength(u * L);
          spark.setAttribute("cx", String(p.x));
          spark.setAttribute("cy", String(p.y));
          spark.style.opacity = "1";
          if (prevP && Math.abs(p.x - prevP.x) + Math.abs(p.y - prevP.y) > 0.01 && t - lastEmit > 55 && bits.length) {
            lastEmit = t;
            const ang = Math.atan2(p.y - prevP.y, p.x - prevP.x) + Math.PI;  // 진행 반대 = 잔상 쪽
            const sp = 0.35 + Math.random() * 0.45;
            const b = bits[emitIdx++ % bits.length];
            b.setAttribute("cx", String(p.x));
            b.setAttribute("cy", String(p.y));
            b.style.setProperty("--dx", (Math.cos(ang) * sp * 5).toFixed(2) + "px");
            b.style.setProperty("--dy", (Math.sin(ang) * sp * 5).toFixed(2) + "px");
            b.style.animation = "none";
            void b.getBoundingClientRect();
            b.style.animation = "";
          }
          prevP = p;
        } else {                                   // 멈춤 — 스파크·잔상 끔
          spark.style.opacity = "0";
          orbit.style.opacity = "";
          prevP = null;
        }
      }
      prevA = a;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button type="button" className={styles.iconbtn} style={vars} aria-label={`알림 ${count}개`} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <g ref={bellRef} className={styles.bell}>
          <path d="M12 3a5 5 0 0 0-5 5v3.2c0 1-.4 2-1.1 2.7L4 16h16l-1.9-2.1c-.7-.7-1.1-1.7-1.1-2.7V8a5 5 0 0 0-5-5z" />
          <path className={styles.bell__clap} d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </g>
        {count > 0 && <circle className={styles["badge-dot"]} cx="18.5" cy="5.5" r="3" />}
        <g className={styles.ring}>
          <path ref={orbitRef} className={styles["ring__orbit"]} pathLength={100} fill="none" d="M4 16h16" />
          <circle ref={sparkRef} className={styles["ring__spark"]} r="0.9" cx="4" cy="16" />
          {BIT_DIRS.map(([dx, dy], i) => (
            <circle
              key={i}
              ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
              className={styles["ring__bit"]}
              r={i === 0 ? "0.4" : "0.35"}
              cx="4"
              cy="16"
              style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
            />
          ))}
        </g>
      </svg>
    </button>
  );
}
