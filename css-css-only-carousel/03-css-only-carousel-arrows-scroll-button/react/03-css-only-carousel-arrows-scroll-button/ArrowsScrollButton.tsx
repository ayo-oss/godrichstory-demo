import type { CSSProperties } from "react";
import styles from "./ArrowsScrollButton.module.scss";

const SLIDES = ["신제품", "한정 수량", "겨울 준비물"];

export type ArrowsScrollButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ArrowsScrollButton({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: ArrowsScrollButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ab} style={vars}>
      {/* 화살표 버튼은 브라우저가 ::scroll-button() 으로 자동 생성·비활성화한다 */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {SLIDES.map((label, i) => (
            <div key={label} className={`${styles.slide} ${styles["slide" + (i + 1)]}`}>
              <span className={styles.cap}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
