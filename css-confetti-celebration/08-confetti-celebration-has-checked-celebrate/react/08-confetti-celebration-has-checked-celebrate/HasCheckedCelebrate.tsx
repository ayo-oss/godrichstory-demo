import { CSSProperties } from "react";
import styles from "./HasCheckedCelebrate.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface HasCheckedCelebrateProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLORS = ["var(--color)", "#ff4d1f", "#ffd23f"];

// JS 없이: 부모 label 이 :has(input:checked) 로 상태를 읽어 체크박스와 컨페티를 함께 켠다
export default function HasCheckedCelebrate({
  duration = "800ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: HasCheckedCelebrateProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <label className={styles.wrap} style={style}>
      <input className={styles.check} type="checkbox" />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.text}>할 일 완료</span>
      {Array.from({ length: 8 }, (_, i) => {
        const pieceStyle: Vars = {
          background: COLORS[i % COLORS.length],
          "--angle": `${(i + 1) * 45}deg`,
        };
        return <span key={i} className={styles.piece} style={pieceStyle} />;
      })}
    </label>
  );
}
