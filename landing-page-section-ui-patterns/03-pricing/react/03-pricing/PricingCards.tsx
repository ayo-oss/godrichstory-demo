import { useEffect, useRef } from "react";
import styles from "./PricingCards.module.scss";

// 결제 주기 버튼을 누르면 요금제 상태가 연간 또는 월간 상태가 되고, 그 상태에 따라 화면에 보이는 금액 값을 다시 계산해 표시한다.
// 계산 겹: 결제 주기 상태 -> 표시 금액 값 재계산. 실사용 클릭 리스너 있음.
const PLANS = [
  { name: "스타터", amountM: "9,000", amountY: "7,200", featured: false },
  { name: "프로", amountM: "19,000", amountY: "15,200", featured: true },
  { name: "비즈니스", amountM: "39,000", amountY: "31,200", featured: false },
];

export default function PricingCards() {
  const rootRef = useRef<HTMLDivElement>(null);
  const mBtnRef = useRef<HTMLButtonElement>(null);
  const yBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const mBtn = mBtnRef.current;
    const yBtn = yBtnRef.current;
    if (!root || !mBtn || !yBtn) return;

    function setYearly(yearly: boolean) {
      root!.classList.remove(styles["is-demo"]);
      root!.classList.toggle(styles["is-yearly"], yearly);
      mBtn!.classList.toggle(styles["is-active"], !yearly);
      yBtn!.classList.toggle(styles["is-active"], yearly);
      mBtn!.setAttribute("aria-pressed", String(!yearly));
      yBtn!.setAttribute("aria-pressed", String(yearly));
    }

    function onMonthly() { setYearly(false); }
    function onYearly() { setYearly(true); }

    mBtn.addEventListener("click", onMonthly);
    yBtn.addEventListener("click", onYearly);
    return () => {
      mBtn.removeEventListener("click", onMonthly);
      yBtn.removeEventListener("click", onYearly);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.pricing} ${styles["is-demo"]}`}>
        <div className={styles.toggle} role="group" aria-label="결제 주기">
          <button
            ref={mBtnRef}
            className={`${styles.toggle__btn} ${styles["toggle__btn--m"]} ${styles["is-active"]}`}
            type="button"
            aria-pressed="true"
          >
            월간
          </button>
          <button
            ref={yBtnRef}
            className={`${styles.toggle__btn} ${styles["toggle__btn--y"]}`}
            type="button"
            aria-pressed="false"
          >
            연간 -20%
          </button>
        </div>
        <div className={styles.plans}>
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={plan.featured ? `${styles.plan} ${styles["plan--featured"]}` : styles.plan}
            >
              {plan.featured && <p className={styles.plan__badge}>추천</p>}
              <p className={styles.plan__name}>{plan.name}</p>
              <div className={styles.plan__price}>
                <span className={`${styles.plan__amount} ${styles["plan__amount--m"]}`}>{plan.amountM}</span>
                <span className={`${styles.plan__amount} ${styles["plan__amount--y"]}`}>{plan.amountY}</span>
              </div>
              <div className={styles["plan__unit-row"]}>
                <span className={`${styles.plan__unit} ${styles["plan__unit--m"]}`}>원/월</span>
                <span className={`${styles.plan__unit} ${styles["plan__unit--y"]}`}>원/월(연 결제)</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
