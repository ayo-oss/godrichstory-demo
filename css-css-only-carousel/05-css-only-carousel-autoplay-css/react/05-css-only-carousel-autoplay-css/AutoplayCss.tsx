import type { CSSProperties } from "react";
import styles from "./AutoplayCss.module.scss";

const SLIDES = ["지금 진행 중", "신규 가입 혜택", "겨울 시즌 오프", "회원 전용 쿠폰"];

export type AutoplayCssProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AutoplayCss({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: AutoplayCssProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ap} style={vars}>
      {/* 아무것도 누르지 않아도 트랙 하나가 @keyframes 로 무한 반복 — 0줄 JS */}
      {/* 끝에는 첫 장의 복제본이 한 장 더 — 마지막→처음 되돌아감이 순간이동으로 보이지 않는다 (텔레포트 금지) */}
      <div className={styles.track}>
        {SLIDES.map((label, i) => (
          <div key={label} className={`${styles.slide} ${styles["slide" + (i + 1)]}`}>
            <span className={styles.cap}>{label}</span>
          </div>
        ))}
        <div className={`${styles.slide} ${styles.slide1}`} aria-hidden="true">
          <span className={styles.cap}>{SLIDES[0]}</span>
        </div>
      </div>
    </div>
  );
}
