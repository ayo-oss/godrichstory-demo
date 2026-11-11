import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./ScrollStaggerTiles.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--stagger"?: string;
};

export interface ScrollStaggerTilesProps {
  duration?: string;
  easing?: string;
  stagger?: string;
}

const LABELS = ["Design", "Build", "Ship", "Scale"];

// 실사용: 진짜 IntersectionObserver 가 그리드 전체가 뷰포트에 들어올 때 in 을 켠다. 타일마다 transition-delay 만 다르다.
// scroll-timeline / view() 는 쓰지 않는다 — 브라우저마다 렌더가 갈린다
export default function ScrollStaggerTiles({
  duration = "2s",
  easing = "ease-out",
  stagger = "160ms",
}: ScrollStaggerTilesProps) {
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

  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--stagger": stagger,
  };

  return (
    <div className={styles.grid} style={style} ref={gridRef}>
      {LABELS.map((label, i) => (
        <div
          key={label}
          className={`${styles.tile} ${inView ? styles.in : ""}`}
          style={{ transitionDelay: inView ? `calc(${stagger} * ${i})` : undefined }}
        >
          <span className={styles.tag}>{label}</span>
        </div>
      ))}
    </div>
  );
}
