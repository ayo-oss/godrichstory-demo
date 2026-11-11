import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MenuMorph.module.scss";

export type MenuMorphProps = {
  /** 점→X 전환 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
  onToggle?: (open: boolean) => void;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// 입자 6개의 시작 좌표(뷰박스)와 흩어질 방향 — 점 3개→X 교차점 중앙 기준 방사형
const BITS: Array<{ x: number; y: number; dx: number; dy: number; r: number }> = [
  { x: 5,  y: 12, dx: -2.6, dy: 0,    r: 0.5 },
  { x: 12, y: 12, dx: 0,    dy: -2.6, r: 0.5 },
  { x: 19, y: 12, dx: 2.6,  dy: 0,    r: 0.5 },
  { x: 7,  y: 7,  dx: -2,   dy: -2,   r: 0.45 },
  { x: 17, y: 17, dx: 2,    dy: 2,    r: 0.45 },
  { x: 17, y: 7,  dx: 2,    dy: -2,   r: 0.45 },
];

export default function MenuMorph({
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
  onToggle,
}: MenuMorphProps) {
  const [open, setOpen] = useState(false);
  const haloRef = useRef<SVGCircleElement>(null);
  const sparkRef = useRef<SVGCircleElement>(null);
  const bitRefs = useRef<Array<SVGCircleElement | null>>([]) as unknown as { current: Array<SVGCircleElement | null> };
  const burstRef = useRef<(() => void) | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 한 겹: 전환 순간 링 파동 + 스파크 입자 (vanilla 데모와 동일 연출).
  // 애니메이션은 css-module keyframes 가 달려 있고, burst 는 재시작만 담당한다.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bits = bitRefs.current.filter(Boolean) as SVGCircleElement[];
    // 01 과 같은 재시작 법칙: none 으로 지웠다가 지운다 — stylesheet 의 모듈 keyframes 이름이 그대로 돌아온다
    const restart = (el: SVGElement, delay?: string) => {
      el.style.animation = "none";
      void el.getBoundingClientRect();
      el.style.animation = "";
      if (delay !== undefined) el.style.animationDelay = delay;
    };
    burstRef.current = () => {
      if (haloRef.current) restart(haloRef.current);
      if (sparkRef.current) restart(sparkRef.current);
      bits.forEach((b, i) => restart(b, (i % 3) * 18 + "ms"));
    };
    return () => { burstRef.current = null; };
  }, []);

  return (
    <button
      type="button"
      className={styles.iconbtn}
      style={vars}
      aria-expanded={open}
      aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
      onClick={() => {
        setOpen((o) => !o);
        burstRef.current?.();
        onToggle?.(!open);
      }}
    >
      <span className={styles.iconbtn__stack}>
        <svg className={`${styles.ic} ${open ? styles["ic--hidden"] : ""}`} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
        </svg>
        <svg className={`${styles.ic} ${open ? "" : styles["ic--hidden"]}`} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <svg className={styles.fx} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <circle ref={haloRef} className={styles["fx__halo"]} cx={12} cy={12} r={6} />
          <circle ref={sparkRef} className={styles["fx__spark"]} r={0.9} cx={12} cy={12} />
          {BITS.map((b, i) => (
            <circle
              key={i}
              ref={(el: SVGCircleElement | null) => { bitRefs.current[i] = el; }}
              className={styles["fx__bit"]}
              r={b.r}
              cx={b.x}
              cy={b.y}
              style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px` } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    </button>
  );
}
