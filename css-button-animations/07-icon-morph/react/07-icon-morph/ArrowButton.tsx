import type { CSSProperties, ReactNode } from "react";
import styles from "./ArrowButton.module.scss";

export type ArrowButtonProps = { children: ReactNode; push?: number; duration?: number; onClick?: () => void };

export default function ArrowButton({ children, push = 8, duration = 240, onClick }: ArrowButtonProps) {
  const vars = { "--push": `${push}px`, "--duration": `${duration}ms` } as CSSProperties;
  return (
    <button type="button" className={styles.btn} style={vars} onClick={onClick}>
      {children}
      <span className={styles.arrow} aria-hidden="true"><i className={styles.line} /><i className={styles.head} /></span>
    </button>
  );
}
