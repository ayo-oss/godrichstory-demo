import { useEffect, useRef, useState } from "react";
import styles from "./CipherAlphabetCycle.module.scss";

export interface CipherAlphabetCycleProps {
  text?: string;
  interval?: number;
}

// 실사용: 뷰포트에 들어오면 각 글자가 알파벳 몇 칸 뒤에서 한 칸씩 되감기며 원래 글자를 찾아간다. 다 맞으면 멈춘다.
export default function CipherAlphabetCycle({ text = "UNLOCK", interval = 130 }: CipherAlphabetCycleProps) {
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
        const offs = text.split("").map((_, i) => 4 + ((i * 2) % 4));
        let n = 0;
        timer = setInterval(() => {
          n += 1;
          let done = true;
          let out = "";
          for (let i = 0; i < text.length; i++) {
            const left = Math.max(0, offs[i] - Math.floor(Math.max(0, n - i * 2) / 2));
            if (left > 0) done = false;
            const base = text.toUpperCase().charCodeAt(i) - 65;
            out += String.fromCharCode(65 + ((base + left) % 26));
          }
          setDisplay(out);
          if (done && timer) { clearInterval(timer); timer = null; }
        }, interval);
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [text, interval]);

  return <p ref={ref} className={styles.text} aria-live="polite">{display}</p>;
}
