// PricingBillingToggle — vanilla 판(run/339/demo/03-pricing-billing-toggle/index.html) 의 React 포트.
// 스위치가 연간으로 넘어갈 때마다 지금 표시된 월간 가격에 12 와 연간 할인율을 곱해 한 해 절약 금액을
// 그 자리에서 구해 배지에 채운다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingBillingToggle.module.scss";

export type PricingBillingToggleProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "스위치 위치와 월간 가격으로 연간 절약 금액을 다시 계산합니다";
const TOGGLE_ARIA = "연간 결제로 전환";

type Step = { monthly: number; yearly: boolean };

const DISCOUNT = 0.2;
const STEPS: Step[] = [
  { monthly: 29, yearly: false },
  { monthly: 29, yearly: true },
  { monthly: 49, yearly: false },
  { monthly: 49, yearly: true }
];

export default function PricingBillingToggle({
  duration = "300ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6"
}: PricingBillingToggleProps) {
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const priceNumRef = useRef<HTMLSpanElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const modeMonthlyRef = useRef<HTMLSpanElement | null>(null);
  const modeYearlyRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const toggle = toggleRef.current;
    const priceNum = priceNumRef.current;
    const badge = badgeRef.current;
    const modeMonthly = modeMonthlyRef.current;
    const modeYearly = modeYearlyRef.current;
    if (!toggle || !priceNum || !badge || !modeMonthly || !modeYearly) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(step: Step): void {
      priceNum!.textContent = String(step.monthly);
      toggle!.setAttribute("aria-checked", step.yearly ? "true" : "false");
      modeMonthly!.classList.toggle(styles.isActive, !step.yearly);
      modeYearly!.classList.toggle(styles.isActive, step.yearly);
      if (step.yearly) {
        const savings = Math.round(step.monthly * 12 * DISCOUNT);
        badge!.hidden = false;
        badge!.textContent = "연간 " + savings + " 절약";
      } else {
        badge!.hidden = true;
      }
    }

    apply(STEPS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % STEPS.length;
        apply(STEPS[idx]);
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
        <p className={styles.priceLine}>
          <span className={styles.priceNum} ref={priceNumRef}>
            29
          </span>
          <span className={styles.priceUnit}> / 월</span>
        </p>
        <div className={styles.switchWrap}>
          <span className={styles.modeLabel} ref={modeMonthlyRef}>
            월간
          </span>
          <button
            className={styles.switchCtl}
            ref={toggleRef}
            type="button"
            role="switch"
            aria-checked="false"
            aria-label={TOGGLE_ARIA}
          >
            <span className={styles.knob} aria-hidden="true" />
          </button>
          <span className={styles.modeLabel} ref={modeYearlyRef}>
            연간
          </span>
        </div>
        <p className={styles.badge} hidden ref={badgeRef} />
      </section>
    </main>
  );
}
