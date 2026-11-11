// PricingPlanCards — vanilla 판(run/339/demo/01-pricing-plan-cards/index.html) 의 React 포트.
// 연/월 스위치가 눌릴 때마다 플랜별 할인율을 monthly 가격에 적용해 월 환산가를 다시 구하고,
// 그 값을 rAF 로 이전 숫자에서 새 숫자까지 이징 계산하며 굴린다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingPlanCards.module.scss";

export type PricingPlanCardsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "연·월 전환마다 할인율을 적용해 표시 가격을 다시 계산합니다";
const SWITCH_LABEL = "연간 결제";
const SWITCH_ARIA = "연간 결제로 전환";

type Plan = { name: string; monthly: number; discount: number };

const PLANS: Plan[] = [
  { name: "Basic", monthly: 12, discount: 0.15 },
  { name: "Pro", monthly: 29, discount: 0.2 },
  { name: "Team", monthly: 59, discount: 0.25 }
];

const ROLL_MS = 600;

function yearlyMonthlyEq(plan: Plan): number {
  return Math.round(plan.monthly * (1 - plan.discount));
}

export default function PricingPlanCards({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: PricingPlanCardsProps) {
  const switchRef = useRef<HTMLButtonElement | null>(null);
  const priceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const badgeRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const switchCtl = switchRef.current;
    if (!switchCtl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const current = PLANS.map((p) => p.monthly);

    function animateValue(el: HTMLElement | null, from: number, to: number, dur: number): void {
      if (!el) return;
      if (reduce || from === to) {
        el.textContent = String(to);
        return;
      }
      let start: number | null = null;
      function step(ts: number): void {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el!.textContent = String(Math.round(from + (to - from) * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function render(yearly: boolean): void {
      switchCtl!.setAttribute("aria-checked", yearly ? "true" : "false");
      PLANS.forEach((plan, i) => {
        const next = yearly ? yearlyMonthlyEq(plan) : plan.monthly;
        const numEl = priceRefs.current![i];
        const badgeEl = badgeRefs.current![i];
        animateValue(numEl, current[i], next, ROLL_MS);
        current[i] = next;
        if (badgeEl) {
          if (yearly) {
            badgeEl.hidden = false;
            badgeEl.textContent = Math.round(plan.discount * 100) + "% 할인 중";
          } else {
            badgeEl.hidden = true;
          }
        }
      });
    }

    render(false);

    let timer = 0;
    if (!reduce) {
      let yearly = false;
      timer = window.setInterval(() => {
        yearly = !yearly;
        render(yearly);
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
        <div className={styles.switchRow}>
          <span className={styles.switchLabel}>{SWITCH_LABEL}</span>
          <button
            className={styles.switchCtl}
            ref={switchRef}
            type="button"
            role="switch"
            aria-checked="false"
            aria-label={SWITCH_ARIA}
          >
            <span className={styles.knob} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.cards}>
          {PLANS.map((plan, i) => (
            <article key={plan.name} className={i === 1 ? styles.card + " " + styles.cardMid : styles.card}>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.price}>
                <span
                  className={styles.priceNum}
                  ref={(el: HTMLSpanElement | null) => {
                    priceRefs.current![i] = el;
                  }}
                >
                  {plan.monthly}
                </span>
                <span className={styles.priceUnit}> / 월</span>
              </p>
              <p
                className={styles.badge}
                hidden
                ref={(el: HTMLParagraphElement | null) => {
                  badgeRefs.current![i] = el;
                }}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
