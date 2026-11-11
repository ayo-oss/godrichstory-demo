import type { CSSProperties, ReactNode } from "react";
import styles from "./ScrollPinNewMessage.module.scss";

export type ScrollPinNewMessageProps = {
  children: ReactNode;
  /** 하단까지 밀려 올라오는 데 걸리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ScrollPinNewMessage({
  children,
  duration = 300,
  easing = "ease-out",
  className = "",
}: ScrollPinNewMessageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <div className={`${styles.bubble} ${styles.enter} ${className}`} style={vars}>
      {children}
    </div>
  );
}
