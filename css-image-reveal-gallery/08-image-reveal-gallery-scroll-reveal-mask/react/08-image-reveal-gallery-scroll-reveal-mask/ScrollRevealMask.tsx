import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./ScrollRevealMask.module.scss";

export interface ScrollRevealMaskProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ScrollRevealMask({
  duration = "700ms",
  easing = "ease-out",
  color = "#2f6df6",
}: ScrollRevealMaskProps) {
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

  const style: CSSProperties = {
    transitionDuration: duration,
    transitionTimingFunction: easing,
    maskPosition: inView ? "100% 0" : "0 0",
    WebkitMaskPosition: inView ? "100% 0" : "0 0",
  };

  return (
    <div ref={ref} className={styles.frame}>
      <div className={styles.photo} style={{ ...style, background: `linear-gradient(150deg, ${color}, #17141a)` }} />
    </div>
  );
}
