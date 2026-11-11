import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EventHero.module.scss";

export type EventHeroProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EventHero({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: EventHeroProps) {
  const [saved, setSaved] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.eh} style={vars}>
      <span className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <span className={styles.mark} aria-hidden="true" />
      <p className={styles.eyebrow}>CONFERENCE — 2026</p>
      <h1 className={styles.title}>제품을 만드는 사람들의 하루</h1>
      <div className={styles.meta}>
        <span className={styles.pill}>10월 18일</span>
        <span className={styles.pill}>서울 · 오프라인</span>
      </div>
      <div className={styles.row}>
        <a className={styles.cta} href="#">참가 신청</a>
        <button
          type="button"
          className={styles.save}
          aria-pressed={saved}
          onClick={() => setSaved((v) => !v)}
        >
          <span className={styles.saveIc} aria-hidden="true" />
          관심 등록
        </button>
      </div>
    </section>
  );
}
