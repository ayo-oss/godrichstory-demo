import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./InlineSpinnerButton.module.scss";

export type InlineSpinnerButtonProps = {
  children: ReactNode;
  /** 글자 ↔ 스피너 교체 시간 (기본 220ms) */
  duration?: number;
  /** 스피너 한 바퀴 시간 (기본 800ms) */
  spin?: number;
  /** 버튼 색 */
  color?: string;
  /** 로딩을 유지할 시간 (기본 900ms, 실제로는 fetch 응답 시점) */
  loadingMs?: number;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
};

type Vars = CSSProperties & { "--duration"?: string; "--spin"?: string; "--color"?: string };

export default function InlineSpinnerButton({
  children,
  duration = 220,
  spin = 800,
  color = "#2f6df6",
  loadingMs = 900,
  onClick,
  type = "button",
}: InlineSpinnerButtonProps) {
  const [loading, setLoading] = useState(false);

  const handle = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      setLoading(true);
      onClick?.(e);
      window.setTimeout(() => setLoading(false), loadingMs);
    },
    [onClick, loadingMs]
  );

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--spin": `${spin}ms`,
    "--color": color,
  };

  return (
    <button
      type={type}
      className={styles.btn}
      style={vars}
      disabled={loading}
      onClick={handle}
    >
      <span className={styles.label} data-hidden={loading}>{children}</span>
      <span className={styles.spinner} data-visible={loading} aria-hidden="true" />
    </button>
  );
}
