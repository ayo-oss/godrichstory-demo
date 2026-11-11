import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./TrackingSqueeze.module.scss";

export interface TrackingSqueezeProps {
  text?: string;
  duration?: string;
  easing?: string;
  spread?: number;
}

// 실사용: 뷰포트에 들어오면 벌어져 있던 글자들이 한 번 좁혀지며 자간이 정리된 제목으로 모인다.
export default function TrackingSqueeze({
  text = "FOCUS",
  duration = "650ms",
  easing = "ease-out",
  spread = 20,
}: TrackingSqueezeProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [inView, setInView] = useState(false);
  const chars = text.split("");
  const mid = (chars.length - 1) / 2;

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
    <h2 className={styles.word} style={style} ref={ref}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className={`${styles.ch} ${inView ? styles.in : ""}`}
          style={{ "--x": `${(i - mid) * spread}px` } as CSSProperties}
        >
          {ch}
        </span>
      ))}
    </h2>
  );
}
