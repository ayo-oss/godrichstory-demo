import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./WordSwap.module.scss";

export type WordSwapProps = {
  prefix: string;
  words: [string, string, string];
  suffix: string;
  /** 단어 세 개가 차례로 도는 전체 루프 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function WordSwap({ prefix, words, suffix, duration = 2000, color = "#2f6df6" }: WordSwapProps) {
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
  }, [words]);
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  const e = (s: string) => ({ "--easing": `steps(${s.length}, end)` } as CSSProperties);
  return (
    <p className={styles.swap} style={vars}>
      <span className={styles.prefix}>{prefix} </span>
      <span className={styles.slot}>
        <span ref={r1} className={`${styles.word} ${styles.w1}`} style={e(words[0])}>{words[0]}</span>
        <span ref={r2} className={`${styles.word} ${styles.w2}`} style={e(words[1])}>{words[1]}</span>
        <span ref={r3} className={`${styles.word} ${styles.w3}`} style={e(words[2])}>{words[2]}</span>
      </span>
      <span className={styles.suffix}> {suffix}</span>
    </p>
  );
}
