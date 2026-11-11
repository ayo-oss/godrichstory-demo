import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./RedactedBarLift.module.scss";

export interface RedactedBarLiftProps {
  words?: string[];
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 검정 막대가 단어 단위로 오른쪽부터 걷히며 순서대로 글자를 드러낸다.
export default function RedactedBarLift({
  words = ["TOP", "SECRET"],
  duration = "520ms",
  easing = "ease-out",
}: RedactedBarLiftProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setLifted(true); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <p className={styles.wrap} style={style} ref={ref}>
      {words.map((w, i) => (
        <span key={i} className={styles.word}>
          {w}
          <span
            className={`${styles.bar} ${lifted ? styles.open : ""}`}
            style={{ transitionDelay: `${i * 250}ms` }}
            aria-hidden="true"
          />
        </span>
      ))}
    </p>
  );
}
