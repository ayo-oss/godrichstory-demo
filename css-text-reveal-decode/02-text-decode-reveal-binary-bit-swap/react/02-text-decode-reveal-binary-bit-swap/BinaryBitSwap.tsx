import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./BinaryBitSwap.module.scss";

export interface BinaryBitSwapProps {
  text?: string;
  duration?: string;
  easing?: string;
}

function toBinary(ch: string) {
  return ch.charCodeAt(0).toString(2).padStart(8, "0");
}

// 실사용: 뷰포트에 들어오면 이진수 여덟 자리가 잠깐 보이다가 크로스페이드로 실제 글자가 겹쳐 떠오른다.
export default function BinaryBitSwap({
  text = "SIGNAL",
  duration = "480ms",
  easing = "ease-out",
}: BinaryBitSwapProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setRevealed(true); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <p className={styles.word} style={style} ref={ref}>
      {text.split("").map((ch, i) => (
        <span key={i} className={styles.c} style={{ transitionDelay: `${i * 90}ms` }}>
          <span className={`${styles.bin} ${revealed ? styles.hide : ""}`}>{toBinary(ch)}</span>
          <span className={`${styles.ch} ${revealed ? styles.show : ""}`}>{ch}</span>
        </span>
      ))}
    </p>
  );
}
