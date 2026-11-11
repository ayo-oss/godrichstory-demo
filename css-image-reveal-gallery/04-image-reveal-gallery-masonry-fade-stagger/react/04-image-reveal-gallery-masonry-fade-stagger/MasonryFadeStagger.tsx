import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./MasonryFadeStagger.module.scss";

export interface MasonryFadeStaggerProps {
  duration?: string;
  easing?: string;
  stagger?: number;
}

const TILES = ["a", "b", "c", "d", "e"] as const;

export default function MasonryFadeStagger({
  duration = "400ms",
  easing = "ease-out",
  stagger = 140,
}: MasonryFadeStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.grid}>
      {TILES.map((t, i) => {
        const style: CSSProperties = {
          transitionDuration: duration,
          transitionTimingFunction: easing,
          transitionDelay: inView ? `${i * stagger}ms` : "0ms",
        };
        return (
          <div
            key={t}
            className={`${styles.tile} ${styles["tile" + t.toUpperCase()]} ${inView ? styles.in : ""}`}
            style={style}
          />
        );
      })}
    </div>
  );
}
