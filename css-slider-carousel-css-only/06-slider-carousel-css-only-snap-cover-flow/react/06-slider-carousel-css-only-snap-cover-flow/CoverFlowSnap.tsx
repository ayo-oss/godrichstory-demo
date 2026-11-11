import type { CSSProperties } from "react";
import styles from "./CoverFlowSnap.module.scss";

export type CoverFlowSnapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CoverFlowSnap({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff4d1f" }: CoverFlowSnapProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.cf} style={vars}>
      {/* 라디오도 JS 도 없다 — scroll-snap-align: center 로 실제 드래그가 카드를 가운데로 데려온다.
          카드는 자기 순서에서부터 이미 기울어 있다 (perspective + rotateY 고정값) */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
