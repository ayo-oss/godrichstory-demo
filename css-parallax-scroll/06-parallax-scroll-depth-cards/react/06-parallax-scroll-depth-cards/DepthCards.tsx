import type { CSSProperties, ReactNode } from "react";
import styles from "./DepthCards.module.scss";

export type DepthCardsProps = {
  /** 맨 앞 카드 라벨 */
  children: ReactNode;
  /** 맨 앞 카드가 밀려나는 거리 (기본 34px) */
  peel?: number;
  /** 뒤 카드일수록 커지는 폭 (기본 .06) */
  scaleStep?: number;
  className?: string;
};

type Vars = CSSProperties & { "--peel"?: string; "--scale-step"?: string };

export default function DepthCards({
  children,
  peel = 34,
  scaleStep = 0.06,
  className = "",
}: DepthCardsProps) {
  const vars: Vars = { "--peel": `${peel}px`, "--scale-step": `${scaleStep}` };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={`${styles.card} ${styles.card3}`} aria-hidden="true" />
      <div className={`${styles.card} ${styles.card2}`} aria-hidden="true" />
      <div className={`${styles.card} ${styles.card1}`}>{children}</div>
    </div>
  );
}
