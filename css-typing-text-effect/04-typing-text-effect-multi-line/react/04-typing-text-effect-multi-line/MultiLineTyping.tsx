import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiLineTyping.module.scss";

export type MultiLineTypingProps = {
  lines: [string, string, string];
  /** 세 줄이 도는 전체 루프 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function MultiLineTyping({ lines, duration = 2000, color = "#2f6df6" }: MultiLineTypingProps) {
  const r1 = useRef<HTMLSpanElement | null>(null);
  const r2 = useRef<HTMLSpanElement | null>(null);
  const r3 = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const cv = document.createElement("canvas").getContext("2d");
    if (!cv) return;
    [r1, r2, r3].forEach((r) => {
      const el = r.current;
      if (!el) return;
      cv.font = getComputedStyle(el).font;
      el.style.setProperty("--full", Math.ceil(cv.measureText(el.textContent || "").width) + "px");
    });
  }, [lines]);
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const e = (s: string) => ({ "--easing": `steps(${s.length}, end)` } as CSSProperties);
  return (
    <div className={styles.lines} style={vars}>
      <p className={styles.row}><span ref={r1} className={`${styles.text} ${styles.l1}`} style={e(lines[0])}>{lines[0]}</span></p>
      <p className={styles.row}><span ref={r2} className={`${styles.text} ${styles.l2}`} style={e(lines[1])}>{lines[1]}</span></p>
      <p className={styles.row}><span ref={r3} className={`${styles.text} ${styles.l3}`} style={e(lines[2])}>{lines[2]}</span></p>
    </div>
  );
}
