import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./NegativeInvertFlash.module.scss";

export interface NegativeInvertFlashProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 색이 반전된 레이어가 두세 번 깜빡이다 사라지고 정상 색 글자만 남는다.
export default function NegativeInvertFlash({
  text = "EXPOSED",
  duration = "160ms",
  easing = "ease-out",
}: NegativeInvertFlashProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        const steps = [1, 0, 1, 0, 1, 0];
        steps.forEach((v, i) => setTimeout(() => setFlash(v), i * 160));
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <p className={styles.wrap} style={style} ref={ref}>
      <span className={styles.base}>{text}</span>
      <span className={styles.negative} style={{ opacity: flash }} aria-hidden="true">{text}</span>
    </p>
  );
}
