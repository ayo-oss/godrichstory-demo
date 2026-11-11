import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollIntensityGlow.module.scss";

export type ScrollIntensityGlowProps = {
  /** intensity 값이 부드러워지는 시간 (기본 300ms) */
  duration?: number;
  color?: string;
};

export default function ScrollIntensityGlow({ duration = 300, color = "#3ec9ff" }: ScrollIntensityGlowProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 뷰포트 교차 비율(0~1)을 그대로 --intensity 로 쓴다 — 실제 스크롤에서만 값이 바뀐다
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => el.style.setProperty("--intensity", en.intersectionRatio.toFixed(2)));
      },
      { threshold: [0, .25, .5, .75, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;

  return (
    <div ref={cardRef} className={styles.card} style={vars}>
      <span className={`${styles.bar} ${styles.barLg}`} />
      <span className={`${styles.bar} ${styles.barSm}`} />
    </div>
  );
}
