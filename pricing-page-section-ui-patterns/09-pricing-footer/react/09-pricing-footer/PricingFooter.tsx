// PricingFooter — vanilla 판(run/339/demo/09-pricing-footer/index.html) 의 React 포트.
// 입력된 팀 인원(headcount)과 필요 용량(storage)을 각 플랜의 한도(LIMITS)와 비교해 두 조건을
// 모두 만족하는 가장 작은 플랜을 다시 찾아 강조한다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingFooter.module.scss";

export type PricingFooterProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "입력한 팀 인원과 저장 용량으로 조건을 만족하는 플랜을 다시 찾습니다";

type Limit = { name: string; seats: number; storageGb: number };
type Need = { headcount: number; storage: number };

const LIMITS: Limit[] = [
  { name: "Basic", seats: 1, storageGb: 5 },
  { name: "Pro", seats: 10, storageGb: 50 },
  { name: "Team", seats: 30, storageGb: 500 }
];

const NEEDS: Need[] = [
  { headcount: 3, storage: 20 },
  { headcount: 1, storage: 3 },
  { headcount: 15, storage: 80 },
  { headcount: 30, storage: 400 }
];

function findMatch(need: Need): string {
  for (let i = 0; i < LIMITS.length; i++) {
    if (LIMITS[i].seats >= need.headcount && LIMITS[i].storageGb >= need.storage) return LIMITS[i].name;
  }
  return LIMITS[LIMITS.length - 1].name;
}

export default function PricingFooter({
  duration = "220ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8"
}: PricingFooterProps) {
  const headcountRef = useRef<HTMLSpanElement | null>(null);
  const storageRef = useRef<HTMLSpanElement | null>(null);
  const planRefs = useRef<(HTMLLIElement | null)[]>([]);
  const chipRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const headcountEl = headcountRef.current;
    const storageEl = storageRef.current;
    const chip = chipRef.current;
    if (!headcountEl || !storageEl || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(need: Need): void {
      headcountEl!.textContent = String(need.headcount);
      storageEl!.textContent = String(need.storage);
      const match = findMatch(need);
      planRefs.current!.forEach((el, i) => {
        if (el) el.classList.toggle(styles.isMatch, LIMITS[i].name === match);
      });
      chip!.textContent = "추천 플랜 " + match;
    }

    apply(NEEDS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % NEEDS.length;
        apply(NEEDS[idx]);
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
        <p className={styles.inputLine}>
          <span ref={headcountRef}>3</span>
          <span className={styles.inputUnit}>명 · </span>
          <span ref={storageRef}>20</span>
          <span className={styles.inputUnit}>GB 필요</span>
        </p>
        <ul className={styles.plans}>
          {LIMITS.map((plan, i) => (
            <li
              key={plan.name}
              className={styles.plan}
              ref={(el: HTMLLIElement | null) => {
                planRefs.current![i] = el;
              }}
            >
              <span className={styles.planName}>{plan.name}</span>
              <span className={styles.planLimit}>
                {plan.seats}명 · {plan.storageGb}GB
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.chip} ref={chipRef}>
          추천 플랜 Basic
        </p>
      </section>
    </main>
  );
}
