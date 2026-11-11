import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./ScanlineMaskSweep.module.scss";

export interface ScanlineMaskSweepProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 노이즈 블록을 스캔라인이 위→아래로 한 번 훑어 글자를 드러낸다.
export default function ScanlineMaskSweep({
  text = "SCANNED",
  duration = "900ms",
  easing = "ease-out",
}: ScanlineMaskSweepProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [swept, setSwept] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setSwept(true); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <div className={styles.wrap} style={style} ref={ref}>
      <span className={styles.text}>{text}</span>
      <span className={`${styles.noise} ${swept ? styles.clear : ""}`} aria-hidden="true" />
      <span className={`${styles.beam} ${swept ? styles.moved : ""}`} aria-hidden="true" />
    </div>
  );
}
