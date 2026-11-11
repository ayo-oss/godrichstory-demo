import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ArrowCue.module.scss";

export type ArrowCueProps = {
  label?: string;
  /** 한 번 오가는 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const END = { x: 18, y: 9 };            // 화살표 '펜 끝' — 꼭짓점이 아니라 끝점을 추적한다
const BOB_PX = 8;                        // bob translateY 최대치 (vanilla $sp-2 와 동일)

const BIT_DIRS: Array<[number, number]> = [
  [2.4, -1.4],
  [1.8, 0.8],
  [2.6, -0.4],
  [1.2, 1.8],
];

export default function ArrowCue({
  label = "더 보기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: ArrowCueProps) {
  const arrowRef = useRef<SVGSVGElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };

  // 한 겹: bob 현재 위치를 getComputedStyle transform 실측으로 읽어(타이밍 하드코딩 없음)
  // 화살표 끝점 스파크 + 진행 반대 방향 찌꺼기 + 미광 잔상 (vanilla 데모와 동일 계산)
  useEffect(() => {
    const arrow = arrowRef.current, spark = sparkRef.current, trail = trailRef.current;
    if (!arrow || !spark || !trail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    let prev: number | null = null, lastEmit = 0, emitIdx = 0, raf = 0;

    const arrowY = () => {
      // translateY 실측(px) → 0..1 진행도. bob 은 8px 오간다
      const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(arrow).transform);
      if (!m) return 0;
      const dy = parseFloat(m[1].split(", ")[5]) || 0;
      return Math.max(0, Math.min(1, dy / BOB_PX));
    };

    const frame = (t: number) => {
      const prog = arrowY();
      // 잔상 — 아래로 이동 중(그리기) 차오르고 올라가는 동안 비운다. 진행도 그대로 dashoffset
      if (prev !== null) {
        const dirDown = prog >= prev;
        const off = dirDown ? 100 - prog * 100 : -(prog * 100);
        trail.style.strokeDashoffset = off.toFixed(2);
        trail.style.opacity = dirDown ? "0.45" : String((1 - prog) * 0.45);
      }

      // 스파크 — 화살표 끝점이 이동 중일 때만 켠다
      if (prev !== null && Math.abs(prog - prev) > 0.004) {
        spark.setAttribute("cx", String(END.x));
        spark.setAttribute("cy", String(END.y + prog * BOB_PX));
        spark.style.opacity = "1";
        if (t - lastEmit > 60 && bits.length) {
          lastEmit = t;
          // 진행 반대(이동 방향 뒤쪽)로 찌꺼기 — 수직 이동이라 각도는 위/아래로 갈린다
          const ang =
            (prog > prev ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 1.2 + Math.PI;
          const sp = 0.4 + Math.random() * 0.5;
          const b = bits[emitIdx++ % bits.length];
          b.setAttribute("cx", String(END.x));
          b.setAttribute("cy", String(END.y + prog * BOB_PX));
          b.style.setProperty("--dx", (Math.cos(ang) * sp * 5).toFixed(2) + "px");
          b.style.setProperty("--dy", (Math.sin(ang) * sp * 5).toFixed(2) + "px");
          b.style.animation = "none";
          void b.getBoundingClientRect();
          b.style.animation = "";
        }
        prev = prog;
      } else {
        if (prev !== null && Math.abs(prog - prev) < 0.0005) spark.style.opacity = "0";
        if (prev === null) prev = prog;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <p className={styles.cue} style={vars}>
      {label}
      <span className={styles.cue__wrap}>
        <svg ref={arrowRef} className={styles.cue__arrow} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className={styles.cue__fx} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            ref={trailRef}
            className={styles.cue__trail}
            d="M6 9l6 6 6-6"
            pathLength={100}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle ref={sparkRef} className={styles.cue__spark} r={1} cx={18} cy={9} />
          {BIT_DIRS.map(([dx, dy], i) => (
            <circle
              key={i}
              ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
              className={styles.cue__bit}
              r={i === 0 ? 0.5 : 0.45}
              cx={18}
              cy={9}
              style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    </p>
  );
}
