import { useEffect, useState, type CSSProperties } from "react";
import styles from "./FadeScrollButton.module.scss";

export type FadeScrollButtonProps = {
  /** 몇 px 내려가야 나타나는가 (기본 240) */
  threshold?: number;
  /** opacity·translateY 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

// 실제 사용: 스크롤이 threshold 를 넘으면 opacity·translateY 전환으로 떠오른다
export default function FadeScrollButton({
  threshold = 240,
  duration = 260,
  easing = "ease-out",
}: FadeScrollButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > threshold);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [threshold]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <button
      type="button"
      className={`${styles.totop} ${visible ? styles.visible : ""}`}
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
