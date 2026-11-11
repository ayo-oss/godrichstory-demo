import type { CSSProperties, ReactNode } from "react";
import styles from "./FlashNotice.module.scss";

export type FlashNoticeProps = {
  children: ReactNode;
  /** 한 번 깜빡이는 데 걸리는 시간 (기본 1000ms) */
  duration?: number;
  /** CSS easing (기본 ease-in-out) */
  easing?: string;
  /** 점·글자 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function FlashNotice({
  children,
  duration = 1000,
  easing = "ease-in-out",
  color = "#fff7e6",
}: FlashNoticeProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.notice} style={vars}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </div>
  );
}
