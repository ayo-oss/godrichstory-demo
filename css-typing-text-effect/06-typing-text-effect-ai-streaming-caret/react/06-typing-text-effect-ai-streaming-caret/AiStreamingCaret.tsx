import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./AiStreamingCaret.module.scss";

export type AiStreamingCaretProps = {
  text: string;
  /** el.animate() duration (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function AiStreamingCaret({ text, duration = 2000, color = "#17141a" }: AiStreamingCaretProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = text.length;
    const d: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const r = 30 + Math.random() * 60; d.push(r); sum += r; }
    let acc = 0;
    const kf = [{ clipPath: "inset(0 100% 0 0)", offset: 0 }];
    for (let i = 0; i < n; i++) { acc += d[i]; kf.push({ clipPath: "inset(0 " + (100 - (acc / sum) * 78) + "% 0 0)", offset: (acc / sum) * 0.78 }); }
    kf.push({ clipPath: "inset(0 0% 0 0)", offset: 0.9 }, { clipPath: "inset(0 100% 0 0)", offset: 1 });
    const anim = el.animate(kf, { duration, iterations: Infinity });
    return () => anim.cancel();
  }, [text, duration]);
  const vars = { "--color": color } as CSSProperties;
  return (
    <p className={styles.ai} style={vars}>
      <span ref={ref} className={styles.text}>{text}</span>
      <span className={styles.orb} aria-hidden="true" />
    </p>
  );
}
