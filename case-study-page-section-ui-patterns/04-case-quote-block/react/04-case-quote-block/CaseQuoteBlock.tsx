// CaseQuoteBlock — vanilla 판(run/340/demo/04-case-quote-block/index.html) 의 React 포트.
// 인용문 길이가 매번 다르므로 목표 폭에 맞는 글자 크기를 canvas measureText 로 실측하며
// 이분 탐색으로 거꾸로 풀어 찾는다(고정 크기 하드코딩이 아니다).
import { useEffect, useRef } from "react";
import styles from "./CaseQuoteBlock.module.scss";

export type CaseQuoteBlockProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "인용문을 실제 캔버스로 재 보고, 목표 폭에 맞는 글자 크기를 거꾸로 풀어서 매번 다시 구합니다";

type Quote = { text: string; author: string };

const QUOTES: Quote[] = [
  { text: "이 카드 컴포넌트 하나로 디자인 검토 시간이 절반으로 줄었습니다.", author: "— 김서연, 아틀라스 프로덕트 리드" },
  { text: "온보딩 화면을 새로 짜고 나서 첫 주 이탈이 눈에 띄게 줄었어요.", author: "— 박도윤, 코발트 그로스팀" },
  { text: "팀 전체가 같은 컴포넌트를 쓰니 리뷰에서 다툴 일이 사라졌습니다.", author: "— 이하은, 실버라인 디자인 시스템" }
];

const MIN_PX = 12;
const MAX_PX = 20;
const TOLERANCE = 1;

export default function CaseQuoteBlock({
  duration = "300ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8"
}: CaseQuoteBlockProps) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const authorRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const textEl = textRef.current;
    const authorEl = authorRef.current;
    if (!textEl || !authorEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");

    function widthAt(text: string, px: number): number {
      if (!ctx) return text.length * px * 0.56;
      ctx.font = "600 " + px + 'px -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
      return ctx.measureText(text).width;
    }

    function solveFontSize(text: string, targetWidth: number): number {
      let lo = MIN_PX;
      let hi = MAX_PX;
      let best = MIN_PX;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        const w = widthAt(text, mid);
        if (w <= targetWidth - TOLERANCE) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      return best;
    }

    function applyQuote(quote: Quote): void {
      const targetWidth = textEl!.clientWidth * 2.6;
      const px = solveFontSize(quote.text, targetWidth);
      textEl!.style.fontSize = px.toFixed(1) + "px";
      textEl!.textContent = quote.text;
      authorEl!.textContent = quote.author;
    }

    let idx = 0;
    applyQuote(QUOTES[0]);
    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % QUOTES.length;
        textEl!.classList.remove(styles.quoteTextSwap);
        void textEl!.offsetWidth;
        applyQuote(QUOTES[idx]);
        textEl!.classList.add(styles.quoteTextSwap);
      }, 700);
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
        <blockquote className={styles.quote}>
          <p className={styles.quoteText} ref={textRef}>이 카드 컴포넌트 하나로 디자인 검토 시간이 절반으로 줄었습니다.</p>
        </blockquote>
        <p className={styles.quoteAuthor} ref={authorRef}>— 김서연, 아틀라스 프로덕트 리드</p>
      </section>
    </main>
  );
}
