import type { CSSProperties } from "react";
import styles from "./SceneSwap.module.scss";

export type SceneSwapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SceneSwap({ duration = 300, easing = "linear", color = "#2f6df6" }: SceneSwapProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ps} style={vars}>
      {/* 스크롤 상자 자체가 타임라인 — 장면 셋이 이 한 줄을 공유하고 키프레임 구간으로 나눠 갖는다 */}
      <div className={styles.scroll}>
        <div className={styles.inner}>
          <div className={styles.pin}>
            <div className={`${styles.scene} ${styles.scene1}`}>장면 1 · 처음</div>
            <div className={`${styles.scene} ${styles.scene2}`}>장면 2 · 익숙해질 때</div>
            <div className={`${styles.scene} ${styles.scene3}`}>장면 3 · 완성</div>
            <div className={styles.hint}>위아래로 스크롤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
