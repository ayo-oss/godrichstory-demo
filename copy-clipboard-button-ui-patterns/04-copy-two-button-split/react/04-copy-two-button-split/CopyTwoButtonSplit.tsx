import { useEffect, useRef } from "react";
import styles from "./CopyTwoButtonSplit.module.scss";

// 두 버튼 분할 — 복사가 성공하면 주 버튼은 체크로 바뀌고, 보조 버튼은 안내 문구로
// 시간차를 두고 뒤따라 바뀐다. 그 시간차는 두 버튼 사이의 실측 거리에서 다시 구한다.
// 계산 겹: getBoundingClientRect 로 두 버튼 중심 거리 실측 → 거리×상수 = 시간차.
// 실사용자 리스너 있음(주 버튼 클릭). 실 클립보드 API 호출 없음 — 상태는 시뮬레이션.
const STAGGER_MS_PER_PX = 0.9;
const HOLD_MS = 700;
const CYCLE_MS = 2000;
const TRIGGER_AT_MS = 300;
const SECONDARY_TEXT = "초대장 공유";
const SECONDARY_DONE = "함께 전달됨";

export default function CopyTwoButtonSplit() {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const copyIconRef = useRef<SVGSVGElement>(null);
  const checkIconRef = useRef<SVGSVGElement>(null);
  const secondaryRef = useRef<HTMLButtonElement>(null);
  const secondaryLabelRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const primaryBtn = primaryRef.current;
    const copyIcon = copyIconRef.current;
    const checkIcon = checkIconRef.current;
    const secondaryBtn = secondaryRef.current;
    const secondaryLabel = secondaryLabelRef.current;
    const live = liveRef.current;
    if (!primaryBtn || !copyIcon || !checkIcon || !secondaryBtn || !secondaryLabel || !live) return;

    function measureStagger() {
      const a = primaryBtn!.getBoundingClientRect();
      const b = secondaryBtn!.getBoundingClientRect();
      const ax = a.left + a.width / 2;
      const bx = b.left + b.width / 2;
      return Math.abs(bx - ax) * STAGGER_MS_PER_PX;
    }

    function apply(t: number, stagger: number) {
      const success = t >= 0;
      copyIcon!.style.opacity = success ? "0" : "1";
      checkIcon!.style.opacity = success ? "1" : "0";
      primaryBtn!.setAttribute("aria-pressed", success ? "true" : "false");
      const secondaryOn = t >= stagger;
      secondaryLabel!.textContent = secondaryOn ? SECONDARY_DONE : SECONDARY_TEXT;
      secondaryBtn!.classList.toggle(styles.isDone, secondaryOn);
      if (success && secondaryOn) {
        live!.textContent = SECONDARY_DONE;
      } else if (!success) {
        live!.textContent = "";
      }
    }

    apply(-1, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: number | null = null;
    let stagger = measureStagger();
    let autoRaf = 0;

    function autoLoop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t - TRIGGER_AT_MS, stagger);
      autoRaf = requestAnimationFrame(autoLoop);
    }

    if (!reduce) autoRaf = requestAnimationFrame(autoLoop);

    function onClick() {
      if (autoRaf) {
        cancelAnimationFrame(autoRaf);
        autoRaf = 0;
      }
      stagger = measureStagger();
      apply(-1, stagger);
      let clickStart: number | null = null;
      function userLoop(ts: number) {
        if (clickStart === null) clickStart = ts;
        const t = ts - clickStart;
        apply(t, stagger);
        if (t < stagger + HOLD_MS) requestAnimationFrame(userLoop);
      }
      requestAnimationFrame(userLoop);
    }

    primaryBtn.addEventListener("click", onClick);
    return () => {
      if (autoRaf) cancelAnimationFrame(autoRaf);
      primaryBtn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.row}>
        <button ref={primaryRef} className={`${styles.btn} ${styles.primary}`} type="button" aria-pressed="false" aria-label="링크 복사">
          <svg ref={copyIconRef} className={styles.icon} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
              <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
            </g>
          </svg>
          <svg ref={checkIconRef} className={`${styles.icon} ${styles.iconCheck}`} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
              <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
            </g>
          </svg>
          <span className={styles.label}>링크 복사</span>
        </button>
        <button ref={secondaryRef} className={`${styles.btn} ${styles.secondary}`} type="button" aria-label="초대장 공유">
          <span ref={secondaryLabelRef} className={styles.label}>초대장 공유</span>
        </button>
      </section>
      <span ref={liveRef} className={styles.sr} role="status" aria-live="polite" />
    </div>
  );
}
