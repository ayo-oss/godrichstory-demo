// PricingFaq — vanilla 판(run/339/demo/05-pricing-faq/index.html) 의 React 포트.
// 항목을 열 때마다 열린 패널들의 실제 콘텐츠 높이를 다시 재 합산하고, 그 총합을 칩에 표시한다(계산 한 겹).
// 패널은 고정 px 값을 인라인으로 대입해 grid-template-rows 를 전환한다 — fr 단위 재축소 오차를 피하려
// auto 로 잠깐 풀어 잰 뒤 0px 로 되돌릴 때 강제 리플로우(offsetHeight 읽기)를 끼워 그 값이 실제로
// 반영되게 한다(그렇지 않으면 다음 전환이 직전 auto 상태에서 시작해 첫 프레임이 어긋난다).
import { useEffect, useRef } from "react";
import styles from "./PricingFaq.module.scss";

export type PricingFaqProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "열린 항목의 실제 높이를 다시 재 전체 목록 높이를 구합니다";

type Item = { q: string; a: string };

const ITEMS: Item[] = [
  { q: "환불 정책이 어떻게 되나요?", a: "결제 후 7일 안에는 사용 여부와 관계없이 전액 환불됩니다." },
  { q: "플랜을 바꿀 수 있나요?", a: "언제든 상위·하위 플랜으로 바꿀 수 있고 남은 기간 요금은 다음 결제에서 조정됩니다." },
  { q: "결제 수단은 무엇을 지원하나요?", a: "신용카드와 계좌 자동이체를 지원하며, 팀 플랜은 세금계산서 발행도 가능합니다." },
  { q: "무료 체험이 있나요?", a: "모든 플랜은 카드 등록 없이 14일 동안 전체 기능을 무료로 써볼 수 있습니다." }
];

export default function PricingFaq({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: PricingFaqProps) {
  const qRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // grid-template-rows 를 잠깐 auto 로 풀어 전환·상태와 무관하게 콘텐츠의 실제 높이를 잰다.
    const naturalHeights = panelRefs.current!.map((panel) => {
      if (!panel) return 0;
      const prevTransition = panel.style.transition;
      panel.style.transition = "none";
      panel.style.gridTemplateRows = "auto";
      const h = panel.scrollHeight;
      panel.style.gridTemplateRows = "0px";
      void panel.offsetHeight; // 0px 을 실제로 반영(플러시)해야 다음 전환이 이 값에서 시작한다
      panel.style.transition = prevTransition;
      return h;
    });

    function measureAndReport(openIndex: number): void {
      let total = 0;
      itemRefs.current!.forEach((item, i) => {
        if (item && i === openIndex) total += naturalHeights[i];
      });
      chip!.textContent = "목록 높이 " + total + "px";
    }

    function setOpen(openIndex: number): void {
      itemRefs.current!.forEach((item, i) => {
        const q = qRefs.current![i];
        const panel = panelRefs.current![i];
        const open = i === openIndex;
        if (item) item.classList.toggle(styles.isOpen, open);
        if (panel) panel.style.gridTemplateRows = open ? naturalHeights[i] + "px" : "0px";
        if (q) q.setAttribute("aria-expanded", open ? "true" : "false");
      });
      measureAndReport(openIndex);
    }

    const cleanups: (() => void)[] = [];
    qRefs.current!.forEach((q, i) => {
      if (!q) return;
      const handler = (): void => {
        const item = itemRefs.current![i];
        const willOpen = !(item && item.classList.contains(styles.isOpen));
        setOpen(willOpen ? i : -1);
      };
      q.addEventListener("click", handler);
      cleanups.push(() => q.removeEventListener("click", handler));
    });

    setOpen(0);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % ITEMS.length;
        setOpen(idx);
      }, 550);
    }

    return () => {
      if (timer) window.clearInterval(timer);
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.acc}>
          {ITEMS.map((item, i) => (
            <div
              key={item.q}
              className={styles.item}
              ref={(el: HTMLDivElement | null) => {
                itemRefs.current![i] = el;
              }}
            >
              <button
                className={styles.q}
                id={"q" + i}
                aria-expanded="false"
                aria-controls={"a" + i}
                ref={(el: HTMLButtonElement | null) => {
                  qRefs.current![i] = el;
                }}
              >
                {item.q}
              </button>
              <div
                className={styles.a}
                id={"a" + i}
                role="region"
                aria-labelledby={"q" + i}
                ref={(el: HTMLDivElement | null) => {
                  panelRefs.current![i] = el;
                }}
              >
                <p className={styles.aText}>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={styles.chip} ref={chipRef}>
          목록 높이 0px
        </p>
      </section>
    </main>
  );
}
