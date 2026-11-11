import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressStatCounter.module.scss";

export type PressStatCounterProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const STATS = [
  { target: 128, label: "언론 보도 건수" },
  { target: 42, label: "협력 매체 수" },
  { target: 3200, label: "누적 다운로드" },
];

export default function PressStatCounter({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PressStatCounterProps) {
  const [values, setValues] = useState<number[]>(STATS.map(() => 0));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const start = performance.now();
    const length = 1200;
    let frame: number;
    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
    function tick(now: number) {
      const t = Math.min(1, (now - start) / length);
      const e = easeOut(t);
      setValues(STATS.map((s) => Math.round(s.target * e)));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className={styles.sc} style={vars}>
      {STATS.map((s, i) => (
        <div key={s.label} className={styles.card}>
          <p className={styles.num}>{values[i].toLocaleString("ko-KR")}</p>
          <p className={styles.label}>{s.label}</p>
        </div>
      ))}
    </section>
  );
}
