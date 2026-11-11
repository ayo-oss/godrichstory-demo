import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiGlyphTyping.module.scss";

export type MultiGlyphTypingProps = {
  text: string;
  /** el.animate() duration (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function MultiGlyphTyping({ text, duration = 2000, color = "#fff7e6" }: MultiGlyphTypingProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas").getContext("2d");
    if (!cv) return;
    cv.font = getComputedStyle(el).font;
    let w = 0;
    const cum = [0];
    for (let i = 0; i < text.length; i++) { w += cv.measureText(text[i]).width; cum.push(w); }
    const kf = cum.map((px) => ({ clipPath: "inset(0 " + (100 - (px / w) * 70) + "% 0 0)", offset: (px / w) * 0.7 }));
    kf.push({ clipPath: "inset(0 0% 0 0)", offset: 0.88 }, { clipPath: "inset(0 100% 0 0)", offset: 1 });
    const anim = el.animate(kf, { duration, iterations: Infinity });
    return () => anim.cancel();
  }, [text, duration]);
  const vars = { "--color": color } as CSSProperties;
  return (
    <p className={styles.glyph} style={vars}>
      <span ref={ref} className={styles.text}>{text}</span>
    </p>
  );
}
