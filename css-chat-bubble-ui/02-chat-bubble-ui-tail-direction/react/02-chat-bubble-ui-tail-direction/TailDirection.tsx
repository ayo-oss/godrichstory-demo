import type { CSSProperties } from "react";
import styles from "./TailDirection.module.scss";

export type TailDirectionProps = {
  children: string;
  /** 발신(right)인가 수신(left)인가 */
  side?: "left" | "right";
  /** 전환에 걸리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function TailDirection({
  children,
  side = "right",
  duration = 300,
  easing = "ease-out",
  className = "",
}: TailDirectionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <div className={`${styles.bubble} ${styles[side]} ${className}`} style={vars}>
      {children}
      <i className={`${styles.tail} ${styles.tailLeft}`} />
      <i className={`${styles.tail} ${styles.tailRight}`} />
    </div>
  );
}
