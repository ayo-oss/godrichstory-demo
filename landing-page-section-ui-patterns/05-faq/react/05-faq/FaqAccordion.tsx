import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./FaqAccordion.module.scss";

// 질문을 열면 답변의 내용 높이 값을 scrollHeight 로 다시 구해 그 값까지 펼치고, 다른 질문을 열면 이전 답변은 0까지 줄며 접힌다.
// 계산 겹: 클릭 상태 -> scrollHeight 값 -> max-height 보간. 실사용 클릭 리스너 있음(데모 재생 자체는 고정 시퀀스).
type Vars = CSSProperties & { "--h"?: string };

const ITEMS = [
  {
    id: "a1",
    h: "64px",
    q: "배송은 얼마나 걸리나요?",
    a: "평균 1~2영업일 이내 출고되며, 도서 산간 지역은 최대 4일이 걸릴 수 있습니다.",
  },
  {
    id: "a2",
    h: "52px",
    q: "환불 규정이 궁금해요",
    a: "수령 후 7일 이내 미개봉 상태면 전액 환불됩니다.",
  },
  {
    id: "a3",
    h: "58px",
    q: "해외 배송도 되나요?",
    a: "일부 국가만 지원하며 결제 단계에서 배송 가능 여부가 표시됩니다.",
  },
];

export default function FaqAccordion() {
  const faqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const faq = faqRef.current;
    if (!faq) return;
    const items = faq.querySelectorAll<HTMLElement>(`.${styles.faq__item}`);

    function closeItem(item: HTMLElement) {
      const q = item.querySelector<HTMLElement>(`.${styles.faq__q}`);
      const a = item.querySelector<HTMLElement>(`.${styles.faq__a}`);
      if (!q || !a) return;
      q.setAttribute("aria-expanded", "false");
      a.style.maxHeight = "0px";
    }

    function openItem(item: HTMLElement) {
      const q = item.querySelector<HTMLElement>(`.${styles.faq__q}`);
      const a = item.querySelector<HTMLElement>(`.${styles.faq__a}`);
      if (!q || !a) return;
      q.setAttribute("aria-expanded", "true");
      a.style.maxHeight = a.scrollHeight + "px";
    }

    const handlers: Array<() => void> = [];
    items.forEach((item) => {
      const q = item.querySelector<HTMLElement>(`.${styles.faq__q}`);
      if (!q) return;
      const onClick = () => {
        faq!.classList.remove(styles["is-demo"]);
        const wasOpen = q.getAttribute("aria-expanded") === "true";
        items.forEach(closeItem);
        if (!wasOpen) openItem(item);
      };
      q.addEventListener("click", onClick);
      handlers.push(() => q.removeEventListener("click", onClick));
    });

    return () => handlers.forEach((off) => off());
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={faqRef} className={`${styles.faq} ${styles["is-demo"]}`}>
        {ITEMS.map((item) => (
          <div key={item.id} className={styles.faq__item} style={{ "--h": item.h } as Vars}>
            <button className={styles.faq__q} type="button" aria-expanded="false" aria-controls={item.id}>
              <span>{item.q}</span>
              <span className={styles.faq__caret} aria-hidden="true" />
            </button>
            <div className={styles.faq__a} id={item.id} role="region">
              <p className={styles["faq__a-inner"]}>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
