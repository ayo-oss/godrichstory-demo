import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RadioArrows.module.scss";

export type RadioArrowsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--pos"?: string };

const N = 3;

export default function RadioArrows({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff4d1f" }: RadioArrowsProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--pos": `${-active * (100 / N)}%` };
  return (
    <div className={styles.ra} style={vars}>
      {/* 원본은 라디오 :checked + 형제결합자로 트랙을 민다(0줄 JS). 리액트 판은 같은 이동을 useState 로 대신한다 */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
      <button type="button" className={styles.prev} aria-label="이전 슬라이드" onClick={() => setActive((active - 1 + N) % N)}>‹</button>
      <button type="button" className={styles.next} aria-label="다음 슬라이드" onClick={() => setActive((active + 1) % N)}>›</button>
    </div>
  );
}
