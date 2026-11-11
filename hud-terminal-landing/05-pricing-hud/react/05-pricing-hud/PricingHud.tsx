import type { CSSProperties } from "react";
import styles from "./PricingHud.module.scss";

export type PricingHudProps = {
  dimName?: string;
  dimPrice?: string;
  dimFeats?: string[];
  lockedName?: string;
  lockedPrice?: string;
  lockedFeats?: string[];
  badge?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingHud({
  dimName = "라이트",
  dimPrice = "무료",
  dimFeats = ["기본 스캔", "채널 1개"],
  lockedName = "프로",
  lockedPrice = "월 9,900원",
  lockedFeats = ["실시간 추적", "채널 무제한"],
  badge = "LOCKED",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: PricingHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pricing} style={vars}>
      <article className={`${styles.card} ${styles.dim}`}>
        <p className={styles.name}>{dimName}</p>
        <p className={styles.price}>{dimPrice}</p>
        <ul className={styles.feats}>
          {dimFeats.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </article>
      <article className={`${styles.card} ${styles.locked}`}>
        <span className={styles.badge}>{badge}</span>
        <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
        <p className={styles.name}>{lockedName}</p>
        <p className={styles.price}>{lockedPrice}</p>
        <ul className={styles.feats}>
          {lockedFeats.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </article>
    </div>
  );
}
