import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PromoCountdownHero.module.scss";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export type PromoCountdownHeroProps = { duration?: number; easing?: string; color?: string; targetMs?: number };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PromoCountdownHero({
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  targetMs = Date.now() + ((2 * 24 * 60 * 60) + (14 * 60 * 60) + (36 * 60) + 9) * 1000,
}: PromoCountdownHeroProps) {
  const [left, setLeft] = useState(Math.max(0, targetMs - Date.now()));
  const [pressed, setPressed] = useState(false);
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
    <section className={styles.ph} style={vars}>
      <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
      <div className={styles.text}>
        <p className={styles.eyebrow}>런칭 프로모션</p>
        <h1 className={styles.title}>얼리버드 30% 할인</h1>
        <p className={styles.sub}>이 시간 이후 정가로 돌아갑니다</p>
      </div>
      <div className={styles.panel}>
        <div className={styles.row} role="timer" aria-live="off">
          <div className={styles.unit}><span className={styles.num}>{pad(d)}</span><span className={styles.unitLabel}>일</span></div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}><span className={styles.num}>{pad(h)}</span><span className={styles.unitLabel}>시</span></div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}><span className={styles.num}>{pad(m)}</span><span className={styles.unitLabel}>분</span></div>
          <span className={styles.sep}>:</span>
          <div className={styles.unit}><span className={`${styles.num} ${styles.numS}`}>{pad(sec)}</span><span className={styles.unitLabel}>초</span></div>
        </div>
        <button
          type="button"
          className={styles.cta}
          aria-pressed={pressed}
          onClick={() => setPressed((v) => !v)}
        >
          {pressed ? "참여 완료 ✓" : "지금 참여하기"}
        </button>
      </div>
    </section>
  );
}
