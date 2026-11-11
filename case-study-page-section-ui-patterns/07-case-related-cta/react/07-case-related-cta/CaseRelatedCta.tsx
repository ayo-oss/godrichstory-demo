// CaseRelatedCta — vanilla 판(run/340/demo/07-case-related-cta/index.html) 의 React 포트.
// 카드마다 태그 목록을 갖고, 지금 보는 사례 태그와 겹치는 개수를 매번 직접 세어 관련도 점수로
// 삼는다. 점수 내림차순으로 다시 정렬하고 FLIP(이동 전 위치 기록 → 갱신 → 이동 후 위치와의
// 차이만큼 역보정 이동)으로 순서 변화를 transform 만으로 보여준다.
import { useEffect, useRef, useState } from "react";
import styles from "./CaseRelatedCta.module.scss";

export type CaseRelatedCtaProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "지금 보는 사례의 태그와 겹치는 개수를 직접 세어 점수를 매기고, 점수 순으로 카드를 다시 줄 세웁니다";

type Card = { id: string; name: string; tags: string[] };

const BASE_SETS: string[][] = [
  ["그로스", "온보딩", "B2B"],
  ["핀테크", "보안", "대시보드"],
  ["이커머스", "체크아웃", "모바일"]
];

const CARDS: Card[] = [
  { id: "nova", name: "노바 · 그로스 리포트", tags: ["그로스", "온보딩", "SaaS"] },
  { id: "atlas", name: "아틀라스 · B2B 영업", tags: ["B2B", "온보딩", "대시보드"] },
  { id: "cobalt", name: "코발트 · 결제 보안", tags: ["핀테크", "보안", "B2B"] },
  { id: "silverline", name: "실버라인 · 체크아웃", tags: ["이커머스", "체크아웃", "모바일"] },
  { id: "terra", name: "테라 · 모바일 대시보드", tags: ["대시보드", "모바일", "그로스"] }
];

function scoreFor(card: Card, baseTags: string[]): number {
  let overlap = 0;
  for (let i = 0; i < card.tags.length; i++) {
    if (baseTags.indexOf(card.tags[i]) !== -1) overlap++;
  }
  return overlap;
}

export default function CaseRelatedCta({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: CaseRelatedCtaProps) {
  const [baseIdx, setBaseIdx] = useState(0);
  const elRefs = useRef<Record<string, HTMLElement | null>>({});
  const rectsBeforeRef = useRef<Record<string, DOMRect>>({});
  const reduceRef = useRef(false);

  const baseTags = BASE_SETS[baseIdx];
  const scored = CARDS.map((card) => ({ card, score: scoreFor(card, baseTags) })).sort(
    (a, b) => b.score - a.score
  );

  useEffect(() => {
    if (reduceRef.current) return;
    const before = rectsBeforeRef.current!;
    CARDS.forEach((card) => {
      const el = elRefs.current![card.id];
      if (!el) return;
      const first = before[card.id];
      if (!first) return;
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx === 0 && dy === 0) return;
      el.style.transition = "none";
      el.style.transform = "translate(" + dx + "px, " + dy + "px)";
      el.getBoundingClientRect();
      el.style.transition = "";
      requestAnimationFrame(() => {
        el.classList.add(styles.cardFlip);
        el.style.transform = "";
      });
      const handler = () => {
        el.classList.remove(styles.cardFlip);
        el.removeEventListener("transitionend", handler);
      };
      el.addEventListener("transitionend", handler);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseIdx]);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) return;

    function cycle(): void {
      const rects: Record<string, DOMRect> = {};
      CARDS.forEach((card) => {
        const el = elRefs.current![card.id];
        if (el) rects[card.id] = el.getBoundingClientRect();
      });
      rectsBeforeRef.current = rects;
      setBaseIdx((i) => (i + 1) % BASE_SETS.length);
    }

    const timer = window.setInterval(cycle, 1600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <p className={styles.baseTagRow}>지금 사례 태그: <span>{baseTags.join(" · ")}</span></p>
        <div className={styles.list} role="list" aria-label="관련 사례">
          {scored.map(({ card, score }) => (
            <article
              key={card.id}
              className={styles.card}
              role="listitem"
              ref={(el: HTMLElement | null) => {
                elRefs.current![card.id] = el;
              }}
            >
              <p className={styles.cardName}>{card.name}</p>
              <p className={styles.cardScore}>
                <span className={styles.cardScoreNum}>{score}</span>
                <span className={styles.cardScoreLabel}>개 태그 겹침</span>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
