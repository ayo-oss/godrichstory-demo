import type { CSSProperties, ReactNode } from "react";
import styles from "./ReactionEmojiPop.module.scss";

export type ReactionEmojiPopProps = {
  children: ReactNode;
  emoji?: string;
  /** 이모지가 튀어 오르는 데 걸리는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ReactionEmojiPop({
  children,
  emoji = "👍",
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  className = "",
}: ReactionEmojiPopProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.bubble}>{children}</div>
      <span className={`${styles.reaction} ${styles.enter}`} aria-hidden="true">{emoji}</span>
    </div>
  );
}
