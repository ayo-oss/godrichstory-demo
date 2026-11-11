import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./RingBadge.module.scss";

export type RingBadgeProps = {
  /** 배지 지름 (기본 56px) */
  size?: number;
  /** 링 색 */
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & { "--size"?: string; "--color"?: string; "--p"?: number };

// 실제 쓰임: 위로가기 버튼과 결합. percent 만큼 conic-gradient 링이 채워진다.
export default function RingBadge({ size = 56, color = "#17141a", onClick }: RingBadgeProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const vars: Vars = { "--size": `${size}px`, "--color": color, "--p": percent };

  return (
    <button
      type="button"
      className={styles.badge}
      style={vars}
      role="progressbar"
      aria-label="Back to top"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      onClick={(e: MouseEvent<HTMLButtonElement>) => { window.scrollTo({ top: 0, behavior: "smooth" }); onClick?.(e); }}
    >
      <span className={styles.inner}><span className={styles.arrow} /></span>
    </button>
  );
}
