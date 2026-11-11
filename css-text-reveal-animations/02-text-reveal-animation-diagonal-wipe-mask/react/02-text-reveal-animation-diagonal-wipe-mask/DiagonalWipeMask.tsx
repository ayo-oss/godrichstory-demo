import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./DiagonalWipeMask.module.scss";

export interface DiagonalWipeMaskProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 같은 배경색 마스크가 사선으로 한 번 밀려나며 글자를 드러낸다.
export default function DiagonalWipeMask({
  text = "NEW COLLECTION",
  duration = "700ms",
  easing = "ease-out",
}: DiagonalWipeMaskProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <div className={styles.wrap} style={style} ref={ref}>
      <span className={styles.text}>{text}</span>
      <span className={`${styles.mask} ${inView ? styles.swept : ""}`} aria-hidden="true" />
    </div>
  );
}
