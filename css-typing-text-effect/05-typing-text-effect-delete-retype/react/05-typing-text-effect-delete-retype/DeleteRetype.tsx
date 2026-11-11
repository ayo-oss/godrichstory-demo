import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DeleteRetype.module.scss";

export type DeleteRetypeProps = {
  text: string;
  /** 타이핑+삭제 한 루프 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function DeleteRetype({ text, duration = 2000, color = "#2f6df6" }: DeleteRetypeProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const cv = el && document.createElement("canvas").getContext("2d");
    if (!el || !cv) return;
    cv.font = getComputedStyle(el).font;
    el.style.setProperty("--full", Math.ceil(cv.measureText(text).width) + "px");
  }, [text]);
  const vars = { "--duration": `${duration}ms`, "--color": color, "--easing": `steps(${text.length}, end)` } as CSSProperties;
  return (
    <p className={styles.search} style={vars}>
      <span ref={ref} className={styles.text}>{text}</span>
    </p>
  );
}
