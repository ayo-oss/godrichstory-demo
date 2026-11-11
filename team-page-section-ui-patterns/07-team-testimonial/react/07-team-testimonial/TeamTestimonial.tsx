// TeamTestimonial — vanilla 판(run/338/demo/07-team-testimonial/index.html) 의 React 포트.
// 계산된 줄높이(line-height)를 목표 칸 높이로 나눠, 인용문 길이에 맞는 글자 크기를
// 거꾸로 구한다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamTestimonial.module.scss";

export type TeamTestimonialProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "계산된 줄높이(line-height)를 목표 칸 높이로 나눠, 인용문 길이에 맞는 글자 크기를 거꾸로 구합니다";

type Quote = { text: string; who: string };
const QUOTES: Quote[] = [
  { text: "짧은 소감 한 줄.", who: "M1 · 디자인" },
  { text: "팀 소개 페이지를 만들면서 가장 신경 쓴 건 속도와 신뢰감이었어요.", who: "M2 · 개발" },
  { text: "보통.", who: "M3 · 운영" }
];

const TARGET_H = 64;
const MIN_FONT = 12;
const MAX_FONT = 20;

function lineHeightRatio(textEl: HTMLElement): number {
  const cs = window.getComputedStyle(textEl);
  const fontSize = parseFloat(cs.fontSize) || 16;
  const lineHeight = parseFloat(cs.lineHeight);
  if (!lineHeight || Number.isNaN(lineHeight)) return 1.4;
  return lineHeight / fontSize;
}

export default function TeamTestimonial({
  duration = "600ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a"
}: TeamTestimonialProps) {
  const boxRef = useRef<HTMLQuoteElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const whoRef = useRef<HTMLElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    const textEl = textRef.current;
    const whoEl = whoRef.current;
    const chip = chipRef.current;
    if (!box || !textEl || !whoEl || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function fitFontSize(length: number): number {
      const estLines = length > 40 ? 3 : length > 18 ? 2 : 1;
      const ratio = lineHeightRatio(textEl!);
      const maxByHeight = TARGET_H / (estLines * ratio);
      return Math.max(MIN_FONT, Math.min(MAX_FONT, Math.floor(maxByHeight)));
    }

    function show(i: number): void {
      const q = QUOTES[i];
      const size = fitFontSize(q.text.length);
      textEl!.style.fontSize = size + "px";
      textEl!.textContent = q.text;
      whoEl!.textContent = q.who;
      chip!.textContent = "font " + size + "px · line " + lineHeightRatio(textEl!).toFixed(1) + "x";
      box!.classList.remove(styles.isSwap);
      void box!.offsetWidth;
      box!.classList.add(styles.isSwap);
    }

    let idx = 0;
    show(0);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % QUOTES.length;
        show(idx);
      }, 420);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.quote}>
        <p className={styles.hint}>{HINT}</p>
        <blockquote className={styles.box} ref={boxRef}>
          <p className={styles.text} ref={textRef} />
          <footer className={styles.who} ref={whoRef} />
        </blockquote>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ color }}>font 16px</span>
        </p>
      </section>
    </main>
  );
}
