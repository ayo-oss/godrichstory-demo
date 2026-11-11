// PricingTestimonial — vanilla 판(run/339/demo/06-pricing-testimonial/index.html) 의 React 포트.
// 후기 3개의 별점 평균을 매번 새로 구하고, 각 카드의 실제 콘텐츠 높이(scrollHeight)를 다시 재
// 가장 큰 값으로 세 카드의 높이를 맞춘다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingTestimonial.module.scss";

export type PricingTestimonialProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "별점 평균과 카드 높이를 후기 내용에 맞춰 다시 계산합니다";

type Review = { text: string; who: string; rating: number };
type ReviewSet = { count: number; reviews: Review[] };

const SETS: ReviewSet[] = [
  {
    count: 128,
    reviews: [
      { text: "요금이 명확해서 좋아요.", who: "리본 스튜디오 · 지수", rating: 5 },
      { text: "전환이 쉬웠고 안내가 친절했습니다.", who: "블룸웍스 · 민호", rating: 4 },
      { text: "팀 플랜으로 옮긴 뒤 관리가 편해졌어요.", who: "노트그린 · 다은", rating: 5 }
    ]
  },
  {
    count: 96,
    reviews: [
      { text: "가격 대비 기능이 많아 만족합니다. 특히 연간 결제 혜택이 커요.", who: "파랑상점 · 세훈", rating: 4 },
      { text: "지원팀 응답이 빨랐어요.", who: "한들컴퍼니 · 유나", rating: 5 },
      { text: "무료 체험 기간 동안 충분히 써보고 결정할 수 있어서 좋았습니다.", who: "다솔웍스 · 재현", rating: 4 }
    ]
  },
  {
    count: 210,
    reviews: [
      { text: "비교표가 있어서 플랜 고르기가 쉬웠어요.", who: "연두하우스 · 하은", rating: 5 },
      { text: "결제 수단이 다양해서 편했습니다.", who: "가온스퀘어 · 도윤", rating: 5 },
      { text: "연간 절약액이 커서 바로 전환했어요. 만족스럽습니다.", who: "별빛랩 · 서아", rating: 4 }
    ]
  }
];

function average(reviews: Review[]): number {
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / reviews.length;
}

export default function PricingTestimonial({
  duration = "220ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: PricingTestimonialProps) {
  const avgNumRef = useRef<HTMLSpanElement | null>(null);
  const avgCountRef = useRef<HTMLSpanElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const quoteRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const whoRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const chipRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const avgNum = avgNumRef.current;
    const avgCount = avgCountRef.current;
    const chip = chipRef.current;
    if (!avgNum || !avgCount || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(set: ReviewSet): void {
      avgNum!.textContent = average(set.reviews).toFixed(1);
      avgCount!.textContent = String(set.count);
      set.reviews.forEach((r, i) => {
        const quote = quoteRefs.current![i];
        const who = whoRefs.current![i];
        if (quote) quote.textContent = "“" + r.text + "”";
        if (who) who.textContent = r.who + " · " + r.rating + "★";
      });
      requestAnimationFrame(() => {
        let maxH = 0;
        cardRefs.current!.forEach((card) => {
          if (card) maxH = Math.max(maxH, card.scrollHeight);
        });
        cardRefs.current!.forEach((card) => {
          if (card) card.style.minHeight = maxH + "px";
        });
        chip!.textContent = "카드 높이 " + maxH + "px";
      });
    }

    apply(SETS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % SETS.length;
        apply(SETS[idx]);
      }, 900);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <p className={styles.avgLine}>
          <span className={styles.avgNum} ref={avgNumRef}>
            0.0
          </span>
          <span className={styles.avgUnit}>
            {" "}
            / 5 · <span ref={avgCountRef}>0</span>명
          </span>
        </p>
        <div className={styles.cards}>
          {[0, 1, 2].map((i) => (
            <article
              key={i}
              className={styles.card}
              ref={(el: HTMLElement | null) => {
                cardRefs.current![i] = el;
              }}
            >
              <p
                className={styles.quote}
                ref={(el: HTMLParagraphElement | null) => {
                  quoteRefs.current![i] = el;
                }}
              />
              <p
                className={styles.who}
                ref={(el: HTMLParagraphElement | null) => {
                  whoRefs.current![i] = el;
                }}
              />
            </article>
          ))}
        </div>
        <p className={styles.chip} ref={chipRef}>
          카드 높이 0px
        </p>
      </section>
    </main>
  );
}
