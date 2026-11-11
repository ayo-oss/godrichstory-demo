import type { CSSProperties } from "react";
import styles from "./PricingMemphis.module.scss";

export type PricingMemphisPlan = { tier: string; price: string; per: string; best?: boolean };

export type PricingMemphisProps = {
  /** 플랜 3개. best 가 true 인 플랜이 점 무늬 머리띠를 이고 뜬다 */
  plans?: PricingMemphisPlan[];
  /** 추천 플랜 배지 글자 */
  badge?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 추천 플랜의 점 무늬 머리띠 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingMemphis({
  plans = [
    { tier: "스타터", price: "₩0", per: "영구 무료" },
    { tier: "프로", price: "₩9,000", per: "한 달 기준", best: true },
    { tier: "팀", price: "₩39,000", per: "한 달 기준" },
  ],
  badge = "인기",
  duration = 2000,
  easing = "ease-out",
  color = "#ffcf33",
}: PricingMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pricem} style={vars}>
      {plans.map((p) => (
        <article
          key={p.tier}
          className={p.best ? `${styles.plan} ${styles.planBest}` : styles.plan}
        >
          {p.best ? <span className={styles.badge}>{badge}</span> : null}
          <h2 className={styles.tier}>{p.tier}</h2>
          <p className={styles.price}>{p.price}</p>
          <p className={styles.per}>{p.per}</p>
        </article>
      ))}
    </section>
  );
}
