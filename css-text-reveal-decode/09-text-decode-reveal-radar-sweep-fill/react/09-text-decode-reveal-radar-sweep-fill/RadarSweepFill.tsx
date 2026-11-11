import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./RadarSweepFill.module.scss";

export interface RadarSweepFillProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 레이더 스윕이 한 바퀴 돌며 지나간 자리의 글자만 순서대로 선명해진다.
export default function RadarSweepFill({
  text = "DETECTED",
  duration = "1400ms",
  easing = "ease-out",
}: RadarSweepFillProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(0);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || timer) return;
        io.unobserve(entry.target);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { setLocked(text.length); return; }
        setSweeping(true);
        let i = 0;
        timer = setInterval(() => {
          i += 1;
          setLocked(i);
          if (i >= text.length && timer) { clearInterval(timer); timer = null; setSweeping(false); }
        }, 160);
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearInterval(timer); };
  }, [text]);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <div className={styles.wrap} style={style} ref={ref}>
      <span className={`${styles.sweep} ${sweeping ? styles.spin : ""}`} aria-hidden="true" />
      <p className={styles.text}>
        {text.split("").map((ch, i) => (
          <span key={i} style={{ opacity: i < locked ? 1 : 0.16 }}>{ch}</span>
        ))}
      </p>
    </div>
  );
}
