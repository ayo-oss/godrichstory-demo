import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./JellyButton.module.scss";

export type JellyButtonProps = {
  children: ReactNode;
  /** 한 번 출렁이는 데 걸리는 시간 (기본 600ms) */
  duration?: number;
  /** CSS easing (기본 과도하게 넘겼다 돌아오는 커스텀 베지어) */
  easing?: string;
  /** 버튼 색 */
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 실제 쓰임: 담기 요청이 성공했을 때 onClick 안에서 API 를 부르고, 결과와 무관하게 한 번 출렁인다.
export default function JellyButton({
  children,
  duration = 600,
  easing = "cubic-bezier(.68,-0.55,.27,1.55)",
  color = "#fff7e6",
  onClick,
}: JellyButtonProps) {
  const [jellying, setJellying] = useState(false);

  const handle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      setJellying(false);
      requestAnimationFrame(() => setJellying(true));
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
      className={`${styles.btn} ${jellying ? styles.jellying : ""}`}
      style={vars}
      onClick={handle}
      onAnimationEnd={() => setJellying(false)}
    >
      {children}
    </button>
  );
}
