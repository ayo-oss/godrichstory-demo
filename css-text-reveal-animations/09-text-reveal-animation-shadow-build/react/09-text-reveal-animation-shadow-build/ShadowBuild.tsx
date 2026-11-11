import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./ShadowBuild.module.scss";

export interface ShadowBuildProps {
  text?: string;
  duration?: string;
  easing?: string;
}

// 실사용: 뷰포트에 들어오면 평평한 글자 뒤로 그림자 층이 한 번 쌓이며 입체적인 두께가 생긴다.
export default function ShadowBuild({
  text = "ARCADE",
  duration = "500ms",
  easing = "ease-out",
}: ShadowBuildProps) {
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
