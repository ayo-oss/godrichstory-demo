import { useEffect, useState, type CSSProperties } from "react";
import styles from "./SlideInButton.module.scss";

export type SlideInButtonProps = {
  threshold?: number;
  /** translateX 전환 시간 (기본 320ms) */
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

// 실제 사용: 스크롤이 threshold 를 넘으면 display 전환 + @starting-style 로 오른쪽에서 미끄러져 들어온다
export default function SlideInButton({
  threshold = 240,
  duration = 320,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: SlideInButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > threshold);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [threshold]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  if (!visible) return null;

  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
    </button>
  );
}
