import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./SplitFlapBoard.module.scss";

export interface SplitFlapBoardProps {
  text?: string;
  duration?: string;
  stagger?: string;
}

// 실사용: 뷰포트에 들어오면 글자판이 위에서 아래로 한 번씩 시차를 두고 뒤집히며 자리 잡는다.
export default function SplitFlapBoard({
  text = "SALE",
  duration = "500ms",
  stagger = "120ms",
}: SplitFlapBoardProps) {
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

  const style = { "--duration": duration } as CSSProperties;

  return (
    <div className={styles.board} style={style} ref={ref}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className={`${styles.char} ${inView ? styles.in : ""}`}
          style={{ transitionDelay: inView ? `calc(${stagger} * ${i})` : undefined }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}
