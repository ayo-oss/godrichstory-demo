import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./ScalePopIn.module.scss";

export interface ScalePopInProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 작게 눌려 있던 글자가 한 번 튕기듯 커지며 자리 잡는다.
export default function ScalePopIn({
  text = "LAUNCHING SOON",
  duration = "550ms",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
}: ScalePopInProps) {
  const ref = useRef<HTMLHeadingElement>(null);
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
    <h2 className={`${styles.text} ${inView ? styles.in : ""}`} style={style} ref={ref}>
      {text}
    </h2>
  );
}
