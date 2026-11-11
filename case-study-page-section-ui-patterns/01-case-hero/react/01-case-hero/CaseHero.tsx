// CaseHero — vanilla 판(run/340/demo/01-case-hero/index.html) 의 React 포트.
// 값을 누적하지 않고 매 프레임 경과 비율(t)로부터 목표값까지의 값을 공식으로 처음부터 다시 구해
// 카운트업하고, 자릿수가 늘어나는 순간엔 canvas measureText 로 실제 렌더 폭을 다시 재 숫자 칸 폭을 갱신한다.
import { useEffect, useRef } from "react";
import styles from "./CaseHero.module.scss";

export type CaseHeroProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const EYEBROW = "프로젝트 노바 · 사례 연구";
const METRIC_LABEL = "핵심 성과";
const HINT = "화면에 머무는 동안 핵심 성과 수치를 0부터 매 프레임 다시 구해 카운트업합니다";

const TARGET = 128;
const EASE_POW = 2;
const ANIM_MS = 1300;
const CYCLE_MS = 1900;

export default function CaseHero({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8"
}: CaseHeroProps) {
  const numRef = useRef<HTMLSpanElement | null>(null);
  const wrapRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const numEl = numRef.current;
    const wrapEl = wrapRef.current;
    if (!numEl || !wrapEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const measureCv = document.createElement("canvas");
    const measureCtx = measureCv.getContext("2d");

    function measureWidth(text: string, px: number): number {
      if (!measureCtx) return text.length * px * 0.62;
      measureCtx.font = "700 " + px + 'px -apple-system, "Segoe UI", sans-serif';
      return measureCtx.measureText(text).width;
    }

    let lastDigits = -1;

    function applyValue(v: number): void {
      numEl!.textContent = String(v);
      const digits = String(v).length;
      if (digits !== lastDigits) {
        lastDigits = digits;
        const px = parseFloat(getComputedStyle(numEl!).fontSize) || 44;
        const w = measureWidth(String(v), px);
        wrapEl!.style.setProperty("--num-w", Math.ceil(w) + "px");
      }
    }

    function runCycle(): void {
      if (reduce) { applyValue(TARGET); return; }
      let start: number | null = null;
      function frame(ts: number): void {
        if (start === null) start = ts;
        const t = Math.min((ts - start) / ANIM_MS, 1);
        const eased = 1 - Math.pow(1 - t, EASE_POW);
        const val = Math.round(TARGET * eased);
        applyValue(val);
        if (t < 1) requestAnimationFrame(frame);
      }
      applyValue(0);
      requestAnimationFrame(frame);
    }

    runCycle();
    let timer = 0;
    if (!reduce) timer = window.setInterval(runCycle, CYCLE_MS);

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{EYEBROW}</p>
        <p className={styles.metricLabel}>{METRIC_LABEL}</p>
        <p className={styles.metricRow} ref={wrapRef}>
          <span className={styles.metricNum} ref={numRef}>0</span>
          <span className={styles.metricUnit}>%</span>
        </p>
        <p className={styles.hint}>{HINT}</p>
      </section>
    </main>
  );
}
