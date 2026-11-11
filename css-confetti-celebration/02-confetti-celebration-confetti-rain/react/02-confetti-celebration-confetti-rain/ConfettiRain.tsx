import { CSSProperties } from "react";
import styles from "./ConfettiRain.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface ConfettiRainProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLORS = ["var(--color)", "#ff4d1f", "#17141a", "#fff7e6"];
// top 을 left% 순서와 다르게 섞는다 — 둘을 같은 인덱스로 선형 배치하면 낙하가 아니라 대각선 한 줄로 보인다
const TOPS = [-40, 160, -180, 20, 100, -120, 60, -200, 140, -20, 180, -100, 40, -160, 120, -60, 200, -140];

export default function ConfettiRain({
  duration = "2s",
  easing = "linear",
  color = "#2f6df6",
}: ConfettiRainProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={style}>
      <span className={styles.banner}>당첨을 축하드려요</span>
      {TOPS.map((top, i) => {
        const pieceStyle: Vars = {
          left: `${((i + 1) / (TOPS.length + 1)) * 100}%`,
          top: `${top}px`,
          background: COLORS[i % COLORS.length],
          animationDuration: `${1700 + (i % 5) * 140}ms`,
        };
        return <span key={i} className={styles.piece} style={pieceStyle} />;
      })}
    </div>
  );
}
