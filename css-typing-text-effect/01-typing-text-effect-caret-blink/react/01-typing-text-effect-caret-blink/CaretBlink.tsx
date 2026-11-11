import type { CSSProperties } from "react";
import styles from "./CaretBlink.module.scss";

export type CaretBlinkProps = {
  text: string;
  /** 깜빡임 한 주기 (기본 300ms) */
  duration?: number;
  color?: string;
};

export default function CaretBlink({ text, duration = 300, color = "#2f6df6" }: CaretBlinkProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <p className={styles.line} style={vars}>
      <span className={styles.text}>{text}</span>
      <span className={styles.caret} aria-hidden="true" />
    </p>
  );
}
