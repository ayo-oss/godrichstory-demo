import styles from "./PricingOrb.module.scss";

export type PricingOrbProps = {
  /** 배지가 한 번 떠올랐다 내려앉는 시간(ms). 2000 의 약수로 둔다 */
  duration?: number;
  easing?: string;
  /** 오브 배지 색. 6자리 hex 로 준다 (#2f6df6) */
  color?: string;
};

type Plan = { plan: string; price: string; feats: string[]; recommended: boolean };

const PLANS: Plan[] = [
  { plan: "스타터", price: "₩0", feats: ["하루 20회", "모델 1종", "이메일 문의"], recommended: false },
  { plan: "프로", price: "₩19,000", feats: ["하루 500회", "모델 4종", "우선 응답"], recommended: true },
  { plan: "팀", price: "₩49,000", feats: ["무제한 호출", "팀 자리 10", "전담 담당자"], recommended: false },
];

// 6자리 hex 에 알파 두 자리를 붙인다 — #2f6df6 + "73" 꼴
function withAlpha(hex: string, alpha: number): string {
  const n = Math.round(alpha * 255);
  return hex + (n < 16 ? "0" : "") + n.toString(16);
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>
  );
}

export default function PricingOrb({
  duration = 1000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: PricingOrbProps) {
  const orbStyle = {
    background:
      "radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 46%), " +
      "radial-gradient(circle at 52% 56%, " + color + " 0%, " + withAlpha(color, 0.9) + " 54%, rgba(23, 20, 26, 0.82) 100%)",
    boxShadow: "0 4px 12px " + withAlpha(color, 0.45),
    animationDuration: duration + "ms",
    animationTimingFunction: easing,
  };

  return (
    <main className={styles.stage}>
      <section className={`${styles.pr} ${styles.demoLoop}`}>
        <header className={styles.head}>
          <h2 className={styles.title}>요금제</h2>
          <p className={styles.sub}>쓰는 만큼만 냅니다.</p>
        </header>
        <div className={styles.grid}>
          {PLANS.map((p) => (
            <article key={p.plan} className={`${styles.card} ${p.recommended ? styles.cardPick : ""}`}>
              {p.recommended ? <span className={styles.orb} aria-hidden="true" style={orbStyle} /> : null}
              <p className={styles.plan}>
                {p.plan}
                {p.recommended ? <span className={styles.flag}>추천</span> : null}
              </p>
              <p className={styles.price}>
                {p.price}
                <span className={styles.per}>/월</span>
              </p>
              <ul className={styles.feats}>
                {p.feats.map((f) => (
                  <li key={f} className={styles.feat}>
                    <span className={styles.ico} aria-hidden="true"><CheckIcon /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.pick} onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); }}>
                고르기
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
