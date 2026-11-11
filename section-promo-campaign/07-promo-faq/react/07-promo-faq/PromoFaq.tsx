import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PromoFaq.module.scss";

export type PromoFaqProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ITEMS = [
  { q: "할인은 언제까지 적용되나요?", a: "마감 시각 전 결제 건까지 자동 적용됩니다." },
  { q: "환불도 되나요?", a: "결제 후 7일 이내 전액 환불됩니다." },
  { q: "연장 신청도 가능한가요?", a: "마감 전 재접속하면 자동으로 연장 안내가 뜹니다." },
];

export default function PromoFaq({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PromoFaqProps) {
  const [open, setOpen] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pf} style={vars}>
      <ul className={styles.list}>
        <span className={styles.scan} aria-hidden="true" />
        {ITEMS.map((item, i) => (
          <li key={item.q} className={`${styles.item} ${open === i ? styles.isOpen : ""}`}>
            <button
              type="button"
              className={styles.q}
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              {item.q}
            </button>
            <div className={styles.a}><p>{item.a}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
