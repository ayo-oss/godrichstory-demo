import { CSSProperties, useState } from "react";
import styles from "./ConfettiBurstButton.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface ConfettiBurstButtonProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const COLORS = ["var(--color)", "#ffd23f", "#ff4d1f", "#fff7e6"];

// 실사용: 클릭마다 burstKey 를 올려 pieces 래퍼를 리마운트한다 — 같은 클래스를 다시 붙이는 것만으로는
// 이미 끝난 keyframes 가 재생되지 않는다 (바닐라판은 classList remove+reflow+add 로 같은 일을 한다)
export default function ConfettiBurstButton({
  duration = "900ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: ConfettiBurstButtonProps) {
  const [burstKey, setBurstKey] = useState(0);
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <div className={styles.wrap} style={style}>
      <button className={styles.btn} type="button" onClick={() => setBurstKey((k) => k + 1)}>
        가입 완료
      </button>
      <span key={burstKey} className={styles.pieces}>
        {Array.from({ length: 12 }, (_, i) => {
          const pieceStyle: Vars = {
            background: COLORS[i % COLORS.length],
            "--angle": `${(i + 1) * 30}deg`,
            "--dist": `${64 + (i % 3) * 22}px`,
            animationDelay: `${(i % 4) * 40}ms`,
          };
          return <span key={i} className={styles.piece} style={pieceStyle} />;
        })}
      </span>
    </div>
  );
}
