import { CSSProperties, PointerEvent, useCallback, useRef } from "react";
import styles from "./SparkleCursorTrail.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface SparkleCursorTrailProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLORS = ["var(--color)", "#2f6df6", "#ff4d1f"];
const OFFSETS: [number, number][] = [
  [0, -28], [24, -14], [24, 14], [0, 28], [-24, 14], [-24, -14],
];

// 실사용: 진짜 pointermove 가 --mx·--my(px) 를 갱신한다. 반짝임은 그 좌표를 calc() 로 읽어 따라온다
export default function SparkleCursorTrail({
  duration = "900ms",
  easing = "ease-out",
  color = "#ffd23f",
}: SparkleCursorTrailProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color, "--mx": "140px", "--my": "88px" };

  return (
    <div className={styles.wrap} style={style} ref={wrapRef} onPointerMove={handleMove}>
      {OFFSETS.map(([ox, oy], i) => {
        const pieceStyle: Vars = {
          color: COLORS[i % COLORS.length],
          "--ox": `${ox}px`,
          "--oy": `${oy}px`,
          animationDelay: `${(i % 3) * 140}ms`,
        };
        return (
          <span key={i} className={styles.piece} style={pieceStyle}>
            ✦
          </span>
        );
      })}
    </div>
  );
}
