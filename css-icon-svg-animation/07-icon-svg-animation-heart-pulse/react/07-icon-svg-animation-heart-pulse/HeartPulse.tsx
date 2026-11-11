import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HeartPulse.module.scss";

export type HeartPulseProps = {
  /** 튕기는 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
  defaultLiked?: boolean;
  onChange?: (liked: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
const HEART = "M12 20.2s-7.3-4.5-9.5-8.9C.9 7.9 2.6 4.6 5.9 4.1c2-.3 3.8.6 4.9 2.2 1-1.6 2.9-2.5 4.9-2.2 3.3.5 5 3.8 3.4 7.2-2.2 4.4-9.1 8.9-9.1 8.9z";
const BIT_COUNT = 6;
const CX = 12, CY = 12;

export default function HeartPulse({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
  defaultLiked = false,
  onChange,
}: HeartPulseProps) {
  const [liked, setLiked] = useState(defaultLiked);
  const pathRef = useRef<SVGPathElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };
  const burstRef = useRef<(() => void) | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 한 겹: 좋아요 순간 하트 가장자리 입자 폭발 + 중앙 스파크 (vanilla 데모와 동일 계산).
  // 하트 path 를 getTotalLength/getPointAtLength 로 샘플링해 입자를 가장자리에 뿌리고
  // 도심에서 바깥 방향으로 흩어지게 한다.
  useEffect(() => {
    const heart = pathRef.current, spark = sparkRef.current;
    if (!heart || !spark || !heart.getTotalLength) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    const L = heart.getTotalLength();
    const restart = (el: SVGElement) => {
      el.style.animation = "none";
      void el.getBoundingClientRect();
      el.style.animation = "";
    };
    burstRef.current = () => {
      restart(spark);
      bits.forEach((b) => {
        const p = heart.getPointAtLength(Math.random() * L);
        b.setAttribute("cx", p.x.toFixed(2));
        b.setAttribute("cy", p.y.toFixed(2));
        const dx = p.x - CX, dy = p.y - CY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const sp = 0.45 + Math.random() * 0.55;
        b.style.setProperty("--dx", ((dx / len) * sp * 6.5).toFixed(2) + "px");
        b.style.setProperty("--dy", ((dy / len) * sp * 6.5).toFixed(2) + "px");
        restart(b);
      });
    };
    return () => { burstRef.current = null; };
  }, []);

  return (
    <button
      type="button"
      className={styles.iconbtn}
      style={vars}
      aria-pressed={liked}
      aria-label="좋아요"
      onClick={() => {
        setLiked((v) => !v);
        burstRef.current?.();
        onChange?.(!liked);
      }}
    >
      <span className={styles.iconbtn__stack}>
        <svg className={`${styles.ic} ${liked ? styles["ic--hidden"] : ""}`} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d={HEART} fill="none" stroke="currentColor" strokeWidth={1.7} />
        </svg>
        <svg className={`${styles.ic} ${styles["ic--fill"]} ${liked ? "" : styles["ic--hidden"]}`} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          {/* pathRef — 입자 좌표 샘플링용 원본 경로. getTotalLength 는 경로 기하학만 보므로
              스케일 애니메이션·투명도와 무관하게 항상 같은 하트 좌표를 돌려준다 */}
          <path ref={pathRef} d={HEART} />
        </svg>
        <svg className={styles.fx} viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <circle ref={sparkRef} className={styles["fx__spark"]} r={0.9} cx={12} cy={12} />
          {Array.from({ length: BIT_COUNT }, (_, i) => (
            <circle
              key={i}
              ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
              className={styles["fx__bit"]}
              r={i < 3 ? 0.5 : 0.45}
              cx={12}
              cy={6}
              style={{ "--dx": "0px", "--dy": "-2.6px" } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    </button>
  );
}
