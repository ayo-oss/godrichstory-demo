import type { CSSProperties } from "react";
import styles from "./BlindsSlatReveal.module.scss";

export type BlindsSlatRevealProps = {
  kicker: string;
  headline: string;
  /** 살이 전부 접히는 데 걸리는 시간 (기본 1200ms) */
  duration?: number;
  easing?: string;
  /** 패널 그라데이션 시작색 */
  color?: string;
  /** 블라인드 살 개수 (기본 6) */
  slats?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BlindsSlatReveal({
  kicker,
  headline,
  duration = 1200,
  easing = "ease-out",
  color = "#2f6df6",
  slats = 6,
}: BlindsSlatRevealProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.reveal} style={vars} aria-label={headline}>
      <div className={styles.panel}>
        <p className={styles.kicker}>{kicker}</p>
        <h2 className={styles.headline}>{headline}</h2>
      </div>
      <div className={styles.slats} aria-hidden="true">
        {Array.from({ length: slats }, (_, i) => (
          <span key={i} className={styles.slat} style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </section>
  );
}
