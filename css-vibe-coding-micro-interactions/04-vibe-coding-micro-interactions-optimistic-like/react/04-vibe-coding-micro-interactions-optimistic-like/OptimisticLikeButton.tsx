import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OptimisticLikeButton.module.scss";

export type OptimisticLikeButtonProps = {
  count: number;
  ariaLabel: string;
  /** 낙관적 업데이트가 유지되는 시간 — 이후 실패로 가정하고 롤백 (기본 800ms) */
  rollbackAfter?: number;
  duration?: number;
  easing?: string;
  color?: string;
  /** 실제로는 여기서 서버에 요청을 보내고, 실패하면 되돌린다 */
  onToggle?: (liked: boolean) => Promise<boolean>;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function OptimisticLikeButton({
  count,
  ariaLabel,
  rollbackAfter = 800,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  onToggle,
}: OptimisticLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handle = async () => {
    setLiked(true); // 서버 응답을 기다리지 않고 즉시 반영
    const ok = onToggle ? await onToggle(true) : false;
    if (!ok) timer.current = setTimeout(() => setLiked(false), rollbackAfter);
  };

  return (
    <button
      type="button"
      className={liked ? `${styles.like} ${styles.liked}` : styles.like}
      style={vars}
      aria-pressed={liked}
      aria-label={ariaLabel}
      onClick={handle}
    >
      <span className={styles.icon} aria-hidden="true">
        <span className={`${styles.heart} ${styles.base}`} />
        <span className={`${styles.heart} ${styles.fill}`} />
      </span>
      <span className={styles.count} aria-hidden="true">
        <span className={styles.track}>
          <span className={styles.num}>{count}</span>
          <span className={styles.num}>{count + 1}</span>
        </span>
      </span>
    </button>
  );
}
