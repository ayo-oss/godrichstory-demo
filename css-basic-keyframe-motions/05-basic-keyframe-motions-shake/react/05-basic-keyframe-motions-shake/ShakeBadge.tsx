import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./ShakeBadge.module.scss";

export type ShakeBadgeProps = {
  children: ReactNode;
  /** 한 번 흔들리는 데 걸리는 시간 (기본 500ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 배지 색 */
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 실제 쓰임: shakeKey 를 바꿀 때마다(예: 검증 실패 횟수) 다시 흔든다.
export default function ShakeBadge({
  children,
  duration = 500,
  easing = "cubic-bezier(.36,.07,.19,.97)",
  color = "#fff7e6",
  onClick,
}: ShakeBadgeProps) {
  const [shaking, setShaking] = useState(false);

  const handle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
      onClick?.(e);
    },
    [onClick]
  );

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <button
      type="button"
      className={`${styles.badge} ${shaking ? styles.shaking : ""}`}
      style={vars}
      onClick={handle}
      onAnimationEnd={() => setShaking(false)}
    >
      {children}
    </button>
  );
}
