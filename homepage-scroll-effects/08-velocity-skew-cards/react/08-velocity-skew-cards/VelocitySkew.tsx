import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./VelocitySkew.module.scss";

export type VelocitySkewProps = {
  duration?: number;
  easing?: string;
  color?: string;
  rows?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VelocitySkew({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  rows = ["빠르게 내려보세요", "카드가 속도를 느낍니다", "멈추면 제자리", "다시 올려도 돼요"],
}: VelocitySkewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 스크롤 속도를 재서 --vel 에 넣는다. 나머지는 CSS calc(skewY) 가 한다
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let last = box.scrollTop;
    let vel = 0;
    let raf = 0;
    const onScroll = () => {
      vel = Math.max(-24, Math.min(24, box.scrollTop - last));
      last = box.scrollTop;
    };
    const decay = () => {
      vel *= 0.86;
      box.style.setProperty("--vel", vel.toFixed(2));
      raf = requestAnimationFrame(decay);
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(decay);
    return () => {
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.vs} style={vars}>
      <div ref={boxRef} className={styles.scroll}>
        {rows.map((t, i) => (
          <div key={i} className={styles.row}>
            <span className={`${styles.thumb} ${styles["thumb" + ((i % 4) + 1)]}`} />
            <span className={styles.t}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
