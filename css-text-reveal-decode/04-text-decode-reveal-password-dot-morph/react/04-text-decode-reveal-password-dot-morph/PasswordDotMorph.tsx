import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./PasswordDotMorph.module.scss";

export interface PasswordDotMorphProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 비밀번호 점이 살짝 커지며 크로스페이드로 실제 글자로 바뀐다.
export default function PasswordDotMorph({
  text = "SECRET",
  duration = "420ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
}: PasswordDotMorphProps) {
  const ref = useRef<HTMLSpanElement>(null);
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
    <span className={styles.wrap} style={style} ref={ref}>
      <span className={`${styles.dots} ${revealed ? styles.hide : ""}`}>{"•".repeat(text.length)}</span>
      <span className={`${styles.real} ${revealed ? styles.show : ""}`}>{text}</span>
    </span>
  );
}
