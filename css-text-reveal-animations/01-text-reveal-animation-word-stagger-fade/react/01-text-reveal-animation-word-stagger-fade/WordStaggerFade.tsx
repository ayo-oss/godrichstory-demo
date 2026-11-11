import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./WordStaggerFade.module.scss";

export interface WordStaggerFadeProps {
  words?: string[];
  duration?: string;
  easing?: string;
  stagger?: string;
}

// 실사용: IntersectionObserver 가 문장이 뷰포트에 들어올 때 한 번 in 을 켠다. 단어마다 transition-delay 만 다르다.
export default function WordStaggerFade({
  words = ["Ship", "It", "Beautifully"],
  duration = "500ms",
  easing = "ease-out",
  stagger = "140ms",
}: WordStaggerFadeProps) {
  const ref = useRef<HTMLParagraphElement>(null);
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
    <p className={styles.line} style={style} ref={ref}>
      {words.map((w, i) => (
        <span
          key={w + i}
          className={`${styles.word} ${inView ? styles.in : ""}`}
          style={{ transitionDelay: inView ? `calc(${stagger} * ${i})` : undefined }}
        >
          {w}
        </span>
      ))}
    </p>
  );
}
