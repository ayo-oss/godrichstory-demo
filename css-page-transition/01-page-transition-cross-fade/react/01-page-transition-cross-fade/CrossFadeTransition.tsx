import type { CSSProperties, ReactNode } from "react";
import styles from "./CrossFadeTransition.module.scss";

export type CrossFadeTransitionProps = {
  /** 어느 페이지가 보이는가. 라우트가 바뀔 때 부모가 이 값을 바꾼다 */
  active: "a" | "b";
  pageA: ReactNode;
  pageB: ReactNode;
  /** 전환이 끝나는 시간 (기본 300ms) */
  duration?: number;
  /** easing (기본 ease-out) */
  easing?: string;
  /** page--b 배경색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CrossFadeTransition({
  active,
  pageA,
  pageB,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  className = "",
}: CrossFadeTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <section className={styles.pageA}>{pageA}</section>
      <section className={styles.pageB}>{pageB}</section>
    </div>
  );
}
