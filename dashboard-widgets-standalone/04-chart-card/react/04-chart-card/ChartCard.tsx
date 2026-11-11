import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChartCard.module.scss";

export type ChartCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--pct-a"?: string; "--pct-b"?: string };

const SEGS = { a: 48, b: 24 };

export default function ChartCard({ duration = 600, easing = "ease-out", color = "#2f6df6" }: ChartCardProps) {
  const [active, setActive] = useState({ a: true, b: true });
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);
  const target = (active.a ? SEGS.a : 0) + (active.b ? SEGS.b : 0);

  useEffect(() => {
    const from = shown;
    const start = performance.now();
    function step(ts: number) {
      const p = Math.min(1, (ts - start) / 300);
      setShown(Math.round(from + (target - from) * p));
      if (p < 1) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const pctA = active.a ? SEGS.a : 0;
  const pctAB = pctA + (active.b ? SEGS.b : 0);
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color,
    "--pct-a": `${pctA}%`, "--pct-b": `${pctAB}%`,
  };

  return (
    <div className={styles.cc} style={vars}>
      <div className={styles.ringWrap}>
        <div className={styles.ring} />
        <div className={styles.center}>
          <span className={styles.num}>{shown}</span><span className={styles.unit}>%</span>
        </div>
      </div>
      <ul className={styles.legend}>
        <li>
          <button type="button" className={active.a ? styles.on : undefined} onClick={() => setActive((s) => ({ ...s, a: !s.a }))}>
            <span className={`${styles.dot} ${styles.dotA}`} />완료 {SEGS.a}%
          </button>
        </li>
        <li>
          <button type="button" className={active.b ? styles.on : undefined} onClick={() => setActive((s) => ({ ...s, b: !s.b }))}>
            <span className={`${styles.dot} ${styles.dotB}`} />진행 {SEGS.b}%
          </button>
        </li>
      </ul>
    </div>
  );
}
