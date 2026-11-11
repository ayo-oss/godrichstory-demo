import type { CSSProperties } from "react";
import styles from "./CurtainFooter.module.scss";

export type CurtainFooterProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CurtainFooter({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: CurtainFooterProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fc} style={vars}>
      {/* 푸터가 문서 맨 끝(sticky bottom) — 본문이 z-index 위를 지나가다 끝에서 비켜준다 */}
      <div className={styles.scroll}>
        <div className={styles.main}>
          <p>본문은 여기서 끝나고</p>
          <p>그 아래에 인사가 기다립니다</p>
          <p>한 칸만 더 내려보세요</p>
        </div>
        <footer className={styles.foot}>
          <span className={styles.cheer}>끝까지 와줘서 고마워요</span>
        </footer>
      </div>
    </div>
  );
}
