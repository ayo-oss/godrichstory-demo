import { useEffect, useRef, useState } from "react";
import styles from "./ScrambleDecode.module.scss";

export interface ScrambleDecodeProps {
  text?: string;
  interval?: number;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 실사용: 뷰포트에 들어오면 무작위 글자가 바뀌다가 왼쪽부터 한 번씩 진짜 글자로 잠긴다. 다 풀리면 멈춘다.
export default function ScrambleDecode({ text = "DECODE", interval = 40 }: ScrambleDecodeProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || timer) return;
        io.unobserve(entry.target);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { setDisplay(text); return; }
        let frame = 0;
        timer = setInterval(() => {
          frame += 1;
          const locked = Math.min(Math.max(0, Math.floor(frame / 3) - 2), text.length);
          let out = "";
          for (let i = 0; i < text.length; i++) {
            out += i < locked ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          setDisplay(out);
          if (locked >= text.length && timer) { clearInterval(timer); timer = null; }
        }, interval);
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [text, interval]);

  return (
    <p ref={ref} className={styles.text} aria-live="polite">{display}</p>
  );
}
