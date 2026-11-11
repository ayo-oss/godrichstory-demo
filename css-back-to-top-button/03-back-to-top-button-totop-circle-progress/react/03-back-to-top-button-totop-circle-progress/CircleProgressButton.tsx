import { useEffect, useState, type CSSProperties } from "react";
import styles from "./CircleProgressButton.module.scss";

export type CircleProgressButtonProps = {
  color?: string;
};

type Vars = CSSProperties & { "--p"?: number };

// 실제 사용: 스크롤 비율을 계산해 --p 에 직접 대입한다. 애니메이션이 아니라 값 그대로 반영한다
export default function CircleProgressButton({ color = "#17141a" }: CircleProgressButtonProps) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const sync = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  const vars: Vars = { "--p": p };
  const circumference = 150.8;

  return (
    <button
      type="button"
      className={styles.totop}
      style={{ ...vars, color }}
      role="progressbar"
      aria-label="읽은 비율"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p)}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.ring} viewBox="0 0 56 56" aria-hidden="true">
        <circle className={styles.track} cx="28" cy="28" r="24" />
        <circle
          className={styles.fill}
          cx="28"
          cy="28"
          r="24"
          style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - p / 100) }}
        />
      </svg>
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
    </button>
  );
}
