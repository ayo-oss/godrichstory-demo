import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProjectQuote.module.scss";

export type ProjectQuoteProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const QUOTES = [
  { text: "디자인 핸드오프 없이도 구현 의도가 그대로 전달됐습니다.", who: "박OO · PM" },
  { text: "일정보다 빠르게 나왔는데 완성도는 오히려 더 높았습니다.", who: "김OO · 대표" },
  { text: "문의부터 배포까지 커뮤니케이션이 막힌 적이 없었습니다.", who: "이OO · 디자이너" },
];

export default function ProjectQuote({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: ProjectQuoteProps) {
  const [order, setOrder] = useState([0, 1, 2]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 실제 동작: "다음 후기"를 누르면 카드 더미가 실제로 한 장씩 뒤로 돌아가며 순서가 바뀐다.
  function next() {
    setOrder((o) => [...o.slice(1), o[0]]);
  }

  return (
    <section className={styles.pq} style={vars} aria-roledescription="carousel" aria-label="추천사">
      <div className={styles.deck}>
        {QUOTES.map((q, i) => (
          <blockquote key={q.who} className={styles.card} data-order={order.indexOf(i)}>
            <span className={styles.mark} aria-hidden="true">&quot;</span>
            <p className={styles.text}>{q.text}</p>
            <p className={styles.who}>{q.who}</p>
          </blockquote>
        ))}
      </div>
      <button type="button" className={styles.next} onClick={next}>다음 후기</button>
      <p className={styles.status} role="status" aria-live="polite">{QUOTES[order[0]].who} 후기를 보는 중</p>
    </section>
  );
}
