import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PressFounderQuote.module.scss";

export type PressFounderQuoteProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const QUOTES = [
  { quote: "\"작은 팀도 대형 언론과 같은 속도로 소식을 전할 수 있어야 한다고 믿습니다.\"", name: "이도현", role: "공동창업자 & CEO" },
  { quote: "\"프레스룸은 홍보가 아니라 신뢰를 확인시켜주는 자리입니다.\"", name: "박서연", role: "공동창업자 & CTO" },
];

export default function PressFounderQuote({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: PressFounderQuoteProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.fq} style={vars}>
      <span className={styles.mark} aria-hidden="true">&quot;</span>
      <div className={styles.stage}>
        {QUOTES.map((q, i) => (
          <figure key={q.name} className={i === active ? `${styles.slide} ${styles.active}` : styles.slide}>
            <blockquote className={styles.quote}>{q.quote}</blockquote>
            <figcaption className={styles.who}><span className={styles.name}>{q.name}</span> · {q.role}</figcaption>
          </figure>
        ))}
      </div>
      <div className={styles.dots} role="group" aria-label="인용문 선택">
        {QUOTES.map((q, i) => (
          <button
            key={q.name}
            type="button"
            className={i === active ? `${styles.dot} ${styles.active}` : styles.dot}
            aria-selected={i === active}
            aria-label={`${i + 1}번째 인용`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}
