import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./StrokeToFill.module.scss";

export interface StrokeToFillProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 테두리만 있던 글자가 왼쪽부터 한 번 채워지며 완성된 글자로 바뀐다.
export default function StrokeToFill({
  text = "SIGNATURE",
  duration = "700ms",
  easing = "ease-out",
}: StrokeToFillProps) {
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
      <span className={styles.outline} aria-hidden="true">{text}</span>
      <span className={`${styles.fill} ${inView ? styles.in : ""}`}>{text}</span>
    </div>
  );
}
