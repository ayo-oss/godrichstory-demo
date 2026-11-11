import type { CSSProperties } from "react";
import styles from "./LeatherStitchCard.module.scss";

export type LeatherStitchCardProps = {
  plan?: string;
  price?: string;
  perk1?: string;
  perk2?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LeatherStitchCard({
  plan = "Pro 멤버십",
  price = "월 24,000원",
  perk1 = "질감 부품 9종 전체",
  perk2 = "상업 이용 포함",
  cta = "선택하기",
  duration = 2000,
  easing = "ease-out",
  color = "#7a4a2b",
}: LeatherStitchCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.leather} style={vars}>
      <div className={styles.card}>
        <p className={styles.plan}>{plan}</p>
        <p className={styles.price}>{price}</p>
        <ul className={styles.perks}>
          <li className={styles.perk}>{perk1}</li>
          <li className={styles.perk}>{perk2}</li>
        </ul>
        <button type="button" className={styles.cta}>{cta}</button>
        <span className={styles.stitch} aria-hidden="true" />
      </div>
    </section>
  );
}
