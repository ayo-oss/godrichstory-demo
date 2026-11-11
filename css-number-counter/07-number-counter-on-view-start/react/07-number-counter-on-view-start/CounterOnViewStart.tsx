import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CounterOnViewStart.module.scss";

export type CounterOnViewStartProps = {
  value: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--num-target"?: number };

export default function CounterOnViewStart({
  value, label, duration = 1200, easing = "ease-out", color = "#fff7e6",
}: CounterOnViewStartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setCounting(entries[0].isIntersecting),
      { threshold: .6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num-target": value,
  };

  return (
    <div ref={ref} className={`${styles.card} ${counting ? styles.isCounting : ""}`} style={vars}>
      <span className={styles.num} aria-hidden="true" />
      <span className={styles.sr}>{value.toLocaleString()}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
