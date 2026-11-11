// CaseIndustryTabs — vanilla 판(run/340/demo/05-case-industry-tabs/index.html) 의 React 포트.
// 실제 클릭 이벤트로 탭을 바꾼다. 밑줄은 고정 px 를 미리 적어두지 않고 눌린 탭을
// getBoundingClientRect 로 매번 실측해 translateX/scaleX 로 옮긴다(BD19). 사례 수도
// 매번 전체 대비 비율을 다시 나눠 구한다.
import { useEffect, useRef } from "react";
import styles from "./CaseIndustryTabs.module.scss";

export type CaseIndustryTabsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "탭을 눌러 보세요 — 밑줄은 짐작한 값이 아니라 눌린 탭의 실제 렌더 폭을 매번 재서 그 자리로 옮깁니다";

type Tab = { label: string; count: number };

const TABS: Tab[] = [
  { label: "이커머스", count: 12 },
  { label: "핀테크", count: 9 },
  { label: "헬스케어", count: 15 },
  { label: "교육", count: 7 }
];

const TOTAL = TABS.reduce((sum, t) => sum + t.count, 0);

export default function CaseIndustryTabs({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#5b8cf8"
}: CaseIndustryTabsProps) {
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const underlineRef = useRef<HTMLDivElement | null>(null);
  const countNumRef = useRef<HTMLSpanElement | null>(null);
  const countLabelRef = useRef<HTMLSpanElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const currentRef = useRef(0);

  useEffect(() => {
    const tabsEl = tabsRef.current;
    const underlineEl = underlineRef.current;
    const countNumEl = countNumRef.current;
    const countLabelEl = countLabelRef.current;
    if (!tabsEl || !underlineEl || !countNumEl || !countLabelEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function measureAndMove(idx: number): void {
      const btn = btnRefs.current![idx];
      if (!btn) return;
      const wrapRect = tabsEl!.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const x = btnRect.left - wrapRect.left;
      const w = btnRect.width;
      underlineEl!.style.transform = "translateX(" + x.toFixed(2) + "px) scaleX(" + w.toFixed(2) + ")";
    }

    function selectTab(idx: number): void {
      currentRef.current = idx;
      btnRefs.current!.forEach((b, i) => {
        if (b) b.setAttribute("aria-selected", i === idx ? "true" : "false");
      });
      const tab = TABS[idx];
      const percent = Math.round((tab.count / TOTAL) * 100);
      countNumEl!.textContent = String(tab.count);
      countLabelEl!.textContent = "개 " + tab.label + " 사례 · 전체 " + TOTAL + "개 중 " + percent + "%";
      measureAndMove(idx);
    }

    const handlers: Array<() => void> = [];
    btnRefs.current!.forEach((btn, i) => {
      if (!btn) return;
      const handler = () => selectTab(i);
      handlers[i] = handler;
      btn.addEventListener("click", handler);
    });

    underlineEl.style.transformOrigin = "left center";
    const raf = requestAnimationFrame(() => selectTab(0));

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        selectTab((currentRef.current! + 1) % TABS.length);
      }, 500);
    }

    const onResize = () => measureAndMove(currentRef.current!);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      if (timer) window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
      btnRefs.current!.forEach((btn, i) => {
        if (btn && handlers[i]) btn.removeEventListener("click", handlers[i]);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.tabsWrap}>
          <div className={styles.tabs} ref={tabsRef} role="tablist" aria-label="업종">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                className={styles.tab}
                role="tab"
                aria-selected={i === 0}
                ref={(el: HTMLButtonElement | null) => {
                  btnRefs.current![i] = el;
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.underline} ref={underlineRef} />
        </div>
        <p className={styles.countRow}>
          <span className={styles.countNum} ref={countNumRef}>12</span>
          <span className={styles.countLabel} ref={countLabelRef}>개 이커머스 사례 · 전체 43개 중 28%</span>
        </p>
      </section>
    </main>
  );
}
