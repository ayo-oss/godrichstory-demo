import type { CSSProperties, ReactNode } from "react";
import styles from "./ReplyQuoteSlide.module.scss";

export type ReplyQuoteSlideProps = {
  quote: string;
  children: ReactNode;
  /** 인용 조각이 밀려 들어오는 데 걸리는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ReplyQuoteSlide({
  quote,
  children,
  duration = 220,
  easing = "ease-out",
  className = "",
}: ReplyQuoteSlideProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <div className={`${styles.bubble} ${className}`} style={vars}>
      <div className={styles.quote}>{quote}</div>
      <p className={styles.reply}>{children}</p>
    </div>
  );
}
