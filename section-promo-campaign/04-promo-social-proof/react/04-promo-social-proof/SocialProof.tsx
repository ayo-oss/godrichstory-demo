import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SocialProof.module.scss";

export type SocialProofProps = { duration?: number; easing?: string; color?: string; target?: number };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SocialProof({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6", target = 2431 }: SocialProofProps) {
  const [count, setCount] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const DUR = 1200;
    function frame(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <section className={styles.sp} style={vars}>
      <div className={styles.avatars} aria-hidden="true">
        <span className={styles.avatar} />
        <span className={styles.avatar} />
        <span className={styles.avatar} />
        <span className={`${styles.avatar} ${styles.more}`}>+</span>
      </div>
      <p className={styles.count}><span className={styles.num}>{count.toLocaleString("ko-KR")}</span>명 참여</p>
      <p className={styles.label}>이미 함께한 얼리버드</p>
    </section>
  );
}
