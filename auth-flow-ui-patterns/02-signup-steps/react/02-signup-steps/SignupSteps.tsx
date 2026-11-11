import { useEffect, useRef } from "react";
import styles from "./SignupSteps.module.scss";

// 회원가입 단계 — 4단계 진행률을 계산해 막대 길이(scaleX)로 표시한다.
// STEP_TOTAL*STEP_MS = 2000ms 로 캡처창과 정확히 일치시켜 4단계가 전부 보이게 한다.
const STEP_TOTAL = 4;
const STEP_MS = 500;
const CYCLE_MS = STEP_TOTAL * STEP_MS;
const STEP_LABELS = ["정보", "인증", "약관", "완료"];

export default function SignupSteps() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stepRefs = [
    useRef<HTMLLIElement>(null),
    useRef<HTMLLIElement>(null),
    useRef<HTMLLIElement>(null),
    useRef<HTMLLIElement>(null),
  ];

  useEffect(() => {
    const track = trackRef.current;
    const steps = stepRefs.map((r) => r.current);
    if (!track || steps.some((s) => !s)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(t: number) {
      const tt = t % CYCLE_MS;
      const idx = Math.min(Math.max(Math.floor(tt / STEP_MS), 0), STEP_TOTAL - 1);
      const current = idx + 1;
      // 단계 경계는 정수(1~4)로 딱딱 끊어 aria·라벨에 반영하되, 막대 자체는 단계 안의
      // 경과분(0~1)을 더해 매 프레임 조금씩 자라게 한다 — 계산 한 겹(보간).
      const within = (tt % STEP_MS) / STEP_MS;
      const ratio = (idx + within) / STEP_TOTAL;
      track!.style.setProperty("--ratio", ratio.toFixed(4));
      track!.setAttribute("aria-valuenow", String(current));
      steps.forEach((el, i) => {
        if (!el) return;
        if (i === idx) {
          el.classList.add(styles.isActive);
        } else {
          el.classList.remove(styles.isActive);
        }
      });
    }

    if (reduce) {
      apply(CYCLE_MS - 1);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      apply(ts - start);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.wrap}>
        <div
          className={styles.track}
          ref={trackRef}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={1}
          aria-label="회원가입 진행 단계"
        >
          <div className={styles.bar} />
        </div>
        <ol className={styles.steps}>
          {STEP_LABELS.map((label, i) => (
            <li
              className={`${styles.step} ${i === 0 ? styles.isActive : ""}`}
              ref={stepRefs[i]}
              key={label}
            >
              <span className={styles.dot} />
              <span className={styles.label}>{label}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
