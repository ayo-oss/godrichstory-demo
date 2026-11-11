// PricingEnterpriseCta — vanilla 판(run/339/demo/07-pricing-enterprise-cta/index.html) 의 React 포트.
// 사용량 슬라이더 값(usage)에 건당 단가(RATE)를 곱해 기본요금(BASE)에 더한 예상 요금을 매번 새로
// 구한다. 사용량이 THRESHOLD 를 넘으면 요금 대신 영업 문의 문구로 바꾼다(계산 한 겹). 슬라이더
// 손잡이 위치는 트랙 실제 폭을 재 px 로 계산해 left 에 대입한다(translateX(-50%) 미사용).
import { useEffect, useRef } from "react";
import styles from "./PricingEnterpriseCta.module.scss";

export type PricingEnterpriseCtaProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "사용량 슬라이더 값으로 예상 요금을 다시 계산하고, 기준을 넘으면 영업 문의로 바꿉니다";
const SLIDER_ARIA = "월간 사용량";

const MAX_USAGE = 1500;
const BASE = 19000;
const RATE = 18;
const THRESHOLD = 1000;
const STEPS = [50, 300, 800, 1200];

export default function PricingEnterpriseCta({
  duration = "600ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6"
}: PricingEnterpriseCtaProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const usageNumRef = useRef<HTMLSpanElement | null>(null);
  const estimateRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const knob = knobRef.current;
    const usageNum = usageNumRef.current;
    const estimate = estimateRef.current;
    if (!track || !fill || !knob || !usageNum || !estimate) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(usage: number): void {
      const pct = usage / MAX_USAGE;
      const trackWidth = track!.clientWidth;
      const knobWidth = knob!.offsetWidth || 16;
      const knobLeft = pct * (trackWidth - knobWidth);
      knob!.style.left = knobLeft + "px";
      fill!.style.width = pct * 100 + "%";
      knob!.setAttribute("aria-valuenow", String(usage));
      usageNum!.textContent = String(usage);

      if (usage > THRESHOLD) {
        estimate!.textContent = "영업팀에 문의해 주세요";
        estimate!.classList.add(styles.isContact);
      } else {
        const won = BASE + usage * RATE;
        estimate!.textContent = "예상 요금 " + won.toLocaleString("ko-KR") + "원";
        estimate!.classList.remove(styles.isContact);
      }
    }

    apply(STEPS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % STEPS.length;
        apply(STEPS[idx]);
      }, 600);
    }

    const onResize = (): void => {
      apply(Number(knob!.getAttribute("aria-valuenow")) || STEPS[0]);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.track} ref={trackRef}>
          <div className={styles.fill} ref={fillRef} />
          <div
            className={styles.knob}
            ref={knobRef}
            role="slider"
            aria-label={SLIDER_ARIA}
            aria-valuemin={0}
            aria-valuemax={MAX_USAGE}
            aria-valuenow={50}
          />
        </div>
        <p className={styles.usageLine}>
          <span ref={usageNumRef}>50</span>
          <span className={styles.usageUnit}> 건 / 월</span>
        </p>
        <p className={styles.estimate} ref={estimateRef}>
          예상 요금 23,000원
        </p>
      </section>
    </main>
  );
}
