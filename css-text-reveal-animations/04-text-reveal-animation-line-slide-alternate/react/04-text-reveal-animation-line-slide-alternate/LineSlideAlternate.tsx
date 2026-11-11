import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./LineSlideAlternate.module.scss";

export interface LineSlideAlternateProps {
  lines?: string[];
  duration?: string;
  easing?: string;
  stagger?: string;
}

// 실사용: 뷰포트에 들어오면 홀수 줄은 왼쪽, 짝수 줄은 오른쪽에서 한 번씩 밀려 들어온다.
export default function LineSlideAlternate({
  lines = ["DESIGN WITH", "INTENTION"],
  duration = "550ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  stagger = "120ms",
}: LineSlideAlternateProps) {
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
    <div className={styles.block} style={style} ref={ref}>
      {lines.map((line, i) => (
        <p
          key={line}
          className={`${styles.line} ${i % 2 === 0 ? styles.fromLeft : styles.fromRight} ${inView ? styles.in : ""}`}
          style={{ transitionDelay: inView ? `calc(${stagger} * ${i})` : undefined }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}
