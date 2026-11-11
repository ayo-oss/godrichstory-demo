// TextWrap — vanilla 판(run/376/demo/03-text-wrap/index.html) 의 React 포트.
// Range.getClientRects() 로 실제 렌더된 줄마다의 폭을 재고, text-wrap: balance 켜짐/꺼짐에
// 따른 줄 수·너비 편차(표준편차)를 계산해 막대와 문구로 보여준다.
import { useEffect, useRef } from "react";
import styles from "./TextWrap.module.scss";

type Box<T> = { current: T };

const STEP_MS = 220;
const MAX_BARS = 4;

export default function TextWrap() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const headingRef = useRef(null) as unknown as Box<HTMLHeadingElement>;
  const toggleBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const supportBadgeRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const barsRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const heading = headingRef.current;
    const toggleBtn = toggleBtnRef.current;
    const supportBadge = supportBadgeRef.current;
    const bars = barsRef.current;
    const readout = readoutRef.current;
    if (!wrap || !heading || !toggleBtn || !supportBadge || !bars || !readout) return;

    const supported = typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("text-wrap", "balance");
    let isDemo = true;
    let on = false;

    supportBadge.textContent = supported ? "text-wrap: balance 지원" : "미지원 — 폴백(균형 없음)";
    supportBadge.classList.toggle(styles.fallback, !supported);

    function lineWidths(): number[] {
      const range = document.createRange();
      range.selectNodeContents(heading!);
      const rects = range.getClientRects();
      const out: number[] = [];
      for (let i = 0; i < rects.length; i++) out.push(rects[i].width);
      return out;
    }

    function stdDev(vals: number[]): number {
      if (vals.length < 2) return 0;
      const mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      const variance = vals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / vals.length;
      return Math.sqrt(variance);
    }

    function render() {
      const widths = lineWidths();
      const maxW = heading!.getBoundingClientRect().width || 1;
      let html = "";
      for (let i = 0; i < MAX_BARS; i++) {
        const w = widths[i] || 0;
        html += '<div class="' + styles.bar + '" style="transform: scaleX(' + (w / maxW).toFixed(3) + '); opacity: ' + (widths[i] ? 1 : 0) + '"></div>';
      }
      bars!.innerHTML = html;
      readout!.textContent = "줄 " + widths.length + "개 · 편차 ±" + Math.round(stdDev(widths)) + "px";
    }

    function apply(next: boolean) {
      on = next && supported;
      heading!.style.setProperty("text-wrap", on ? "balance" : "wrap");
      toggleBtn!.setAttribute("aria-pressed", String(on));
      render();
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onToggleClick() { human(); apply(!on); }
    toggleBtn.addEventListener("click", onToggleClick);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && supported && ts - last >= STEP_MS) { last = ts; apply(!on); }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply(false);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      toggleBtn!.removeEventListener("click", onToggleClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.head}>
          <span className={styles.supportBadge} ref={supportBadgeRef}>확인 중</span>
          <button className={styles.toggleBtn} ref={toggleBtnRef} type="button" aria-pressed="false">균형 줄바꿈</button>
        </div>
        <div className={styles.frame}>
          <h3 className={styles.heading} ref={headingRef}>브라우저 기본값 리셋과 안전 영역까지 정리한 css 초기화 아홉 가지</h3>
          <div className={styles.bars} ref={barsRef}></div>
        </div>
        <div className={styles.readout} ref={readoutRef}>줄 —개 · 편차 —px</div>
      </div>
    </main>
  );
}
