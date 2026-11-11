import { useEffect, useRef, useState } from "react";
import styles from "./CountdownChecksum.module.scss";

export interface CountdownChecksumProps {
  text?: string;
  interval?: number;
}

// 실사용: 뷰포트에 들어오면 밑줄이 진행률에 맞춰 왼쪽부터 글자로 채워진다. 다 채우면 멈춘다.
export default function CountdownChecksum({ text = "VERIFIED", interval = 90 }: CountdownChecksumProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || timer) return;
        io.unobserve(entry.target);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { setFilled(text.length); return; }
        timer = setInterval(() => {
          setFilled((f) => {
            const next = f + 1;
            if (next >= text.length && timer) { clearInterval(timer); timer = null; }
            return Math.min(text.length, next);
          });
        }, interval);
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [text, interval]);

  return (
    <p ref={ref} className={styles.row} aria-live="polite">
      <span className={styles.text}>
        {text.split("").map((ch, i) => (
          <span key={i} className={i === filled - 1 ? styles.pop : undefined}>{i < filled ? ch : "_"}</span>
        ))}
      </span>
      <span className={styles.pct}>{Math.round((filled / text.length) * 100)}%</span>
    </p>
  );
}
