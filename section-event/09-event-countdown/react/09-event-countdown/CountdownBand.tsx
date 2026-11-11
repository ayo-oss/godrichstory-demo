import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CountdownBand.module.scss";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export type CountdownBandProps = { duration?: number; easing?: string; color?: string; targetMs?: number };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CountdownBand({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  targetMs = Date.now() + ((7 * 24 * 60 * 60) + (4 * 60 * 60) + (20 * 60) + 15) * 1000,
}: CountdownBandProps) {
  const [left, setLeft] = useState(Math.max(0, targetMs - Date.now()));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, targetMs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <section className={styles.cd} style={vars}>
      <span className={styles.glow} aria-hidden="true" />
      <p className={styles.label}>컨퍼런스 시작까지</p>
      <div className={styles.row} role="timer" aria-live="off">
        <div className={styles.unit}><span className={styles.num}>{pad(d)}</span><span className={styles.unitLabel}>일</span></div>
        <span className={styles.sep}>:</span>
        <div className={styles.unit}><span className={styles.num}>{pad(h)}</span><span className={styles.unitLabel}>시</span></div>
        <span className={styles.sep}>:</span>
        <div className={styles.unit}><span className={styles.num}>{pad(m)}</span><span className={styles.unitLabel}>분</span></div>
        <span className={styles.sep}>:</span>
        <div className={styles.unit}><span className={`${styles.num} ${styles.numS}`}>{pad(sec)}</span><span className={styles.unitLabel}>초</span></div>
      </div>
    </section>
  );
}
