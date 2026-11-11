import type { CSSProperties } from "react";
import styles from "./SpotlightCircle.module.scss";

export type SpotlightCircleProps = {
  duration?: number;
  easing?: string;
  color?: string;
  secret?: string;
  reveal?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SpotlightCircle({
  duration = 300,
  easing = "linear",
  color = "#2f6df6",
  secret = "아직 비밀",
  reveal = "지금 공개",
}: SpotlightCircleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.sl} style={vars}>
      {/* 스포트라이트 = 위에 얹은 밝은 화면의 원형 창. 스크롤이 반지름을 키운다 */}
      <div className={styles.scroll}>
        <div className={styles.inner}>
          <div className={styles.pin}>
            <div className={styles.dim}>
              <span className={styles.dimm}>{secret}</span>
            </div>
            <div className={styles.spot}>
              <span className={styles.cap}>{reveal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
