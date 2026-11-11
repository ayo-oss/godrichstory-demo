import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./PlansRevealOnScroll.module.scss";

export interface PlansRevealOnScrollProps {
  duration?: string;
  easing?: string;
  stagger?: string;
}

const PLANS = [
  { tag: "Basic", price: "$9" },
  { tag: "Pro", price: "$29" },
  { tag: "Team", price: "$79" },
];

// 실사용: 진짜 IntersectionObserver 가 그리드가 뷰포트에 들어올 때 in 을 켠다. 카드마다 transition-delay 만 다르다.
export default function PlansRevealOnScroll({
  duration = "400ms",
  easing = "ease-out",
  stagger = "140ms",
}: PlansRevealOnScrollProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <div className={styles.grid} style={style} ref={gridRef}>
      {PLANS.map((p, i) => (
        <div
          key={p.tag}
          className={`${styles.card} ${i === 1 ? styles.mid : ""} ${inView ? styles.in : ""}`}
          style={{ transitionDelay: inView ? `calc(${stagger} * ${i})` : undefined }}
        >
          <span className={styles.tag}>{p.tag}</span>
          <span className={styles.price}>{p.price}</span>
        </div>
      ))}
    </div>
  );
}
