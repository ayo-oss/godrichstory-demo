import type { CSSProperties } from "react";
import styles from "./ScrollFadeBehind.module.scss";

export type ScrollFadeBehindProps = {
  title?: string;
  subtitle?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ScrollFadeBehind({
  title = "Scroll to reveal.",
  subtitle = "The old headline recedes behind the next section.",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ScrollFadeBehindProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 서비스라면 scroll-timeline / animation-timeline: view() 로 스크롤 진행률에 직접 묶는다.
  // 브라우저 지원 차이가 커서 이 컴포넌트는 같은 모양을 keyframes 루프로 대신 보여준다.
  return (
    <div className={styles.hero} style={vars}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>{subtitle}</p>
    </div>
  );
}
