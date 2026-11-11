import { useEffect, useRef, useState } from "react";
import styles from "./HexByteSettle.module.scss";

export interface HexByteSettleProps {
  text?: string;
  interval?: number;
}

const HEX = "0123456789ABCDEF";

// 실사용: 뷰포트에 들어오면 오른쪽부터 한 자리씩 무작위 16진수가 실제 글자로 잠긴다. 다 풀리면 멈춘다.
export default function HexByteSettle({ text = "ACCESS", interval = 90 }: HexByteSettleProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [chars, setChars] = useState<{ ch: string; on: boolean }[]>(
    text.split("").map((ch) => ({ ch, on: false }))
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || timer) return;
        io.unobserve(entry.target);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { setChars(text.split("").map((ch) => ({ ch, on: true }))); return; }
        let n = 0;
        timer = setInterval(() => {
          n += 1;
          const settled = Math.min(text.length, Math.max(0, Math.floor(n / 5) - 1));
          setChars(text.split("").map((ch, i) => (
            i >= text.length - settled
              ? { ch, on: true }
              : { ch: HEX[Math.floor(Math.random() * 16)], on: false }
          )));
          if (settled >= text.length && timer) { clearInterval(timer); timer = null; }
        }, interval);
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [text, interval]);

  return (
    <p ref={ref} className={styles.text} aria-live="polite">
      {chars.map((c, i) => (
        <span key={i} className={c.on ? styles.on : styles.off}>{c.ch}</span>
      ))}
    </p>
  );
}
