import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TicketPricing.module.scss";

const TIERS = [
  { name: "스탠다드", early: "49,000원", regular: "69,000원", desc: "세션 전체 · 자료집", pop: false },
  { name: "프리미엄", early: "89,000원", regular: "119,000원", desc: "세션 전체 · 네트워킹 런치", pop: true },
  { name: "VIP", early: "149,000원", regular: "189,000원", desc: "전 혜택 · 연사 디너", pop: false },
];

export type TicketPricingProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TicketPricing({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: TicketPricingProps) {
  const [regular, setRegular] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.tp} style={vars}>
      <button
        type="button"
        role="switch"
        aria-checked={regular}
        className={styles.switch}
        onClick={() => setRegular((v) => !v)}
      >
        <span className={styles.switchLabel}>얼리버드</span>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.knob} style={{ transform: regular ? "translateX(18px)" : "translateX(0)" }} />
        </span>
        <span className={styles.switchLabel}>정가</span>
      </button>
      <ul className={styles.cards}>
        {TIERS.map((t) => (
          <li key={t.name} className={t.pop ? `${styles.card} ${styles.pop}` : styles.card}>
            {t.pop && <span className={styles.badge}>인기</span>}
            <p className={styles.tier}>{t.name}</p>
            <p className={styles.price}>{regular ? t.regular : t.early}</p>
            <p className={styles.desc}>{t.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
