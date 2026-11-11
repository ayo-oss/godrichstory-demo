// ColorFillWipe — vanilla 판(run/368/demo/06-custom-checkbox-color-fill-wipe/index.html) 의 React 포트.
// 카드의 실측 대각선 길이(getBoundingClientRect)를 재고, clip-path circle() 반지름을
// easeOutCubic 로 그 길이까지 rAF 적분해 한쪽 모서리에서 반대쪽까지 채움 배경을 만든다.
import { useEffect, useRef } from "react";
import styles from "./ColorFillWipe.module.scss";

type Box<T> = { current: T };

export default function ColorFillWipe() {
  const rootRef = useRef(null) as unknown as Box<HTMLLabelElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const fillRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    let WIPE_MS = 420; // 계산 겹 상수: 채움이 한쪽 모서리에서 반대쪽까지 번지는 데 걸리는 실제 시간(ms)
    const CYCLE_MS = 900; // 자동 루프가 체크·해제를 오가는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const input = inputRef.current;
    const card = cardRef.current;
    const fill = fillRef.current;
    if (!root || !input || !card || !fill) return;

    let isDemo = true;
    let diag = 0;
    let wiping = false, wipeStart = 0, wipeDir = 1;

    function measure() {
      // 계산 겹: 카드 실측 대각선 길이 — 채움 원이 반대쪽 모서리에 정확히 닿는 반지름 값
      const r = card!.getBoundingClientRect();
      diag = Math.sqrt(r.width * r.width + r.height * r.height);
    }

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function setChecked(next: boolean, ts: number) {
      input!.checked = next;
      wipeDir = next ? 1 : -1;
      wipeStart = ts;
      wiping = true;
    }

    function onChange() { human(); setChecked(input!.checked, performance.now()); }
    input.addEventListener("change", onChange);

    let cycleStart = 0;
    let lastState = false;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      if (!diag) measure();

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) { lastState = step; setChecked(step, ts); }
      }

      if (wiping) {
        const t = Math.min(1, (ts - wipeStart) / WIPE_MS);
        const p = easeOutCubic(t);
        const r = wipeDir === 1 ? p * diag : (1 - p) * diag;
        fill!.style.clipPath = "circle(" + r.toFixed(1) + "px at 0% 100%)";
        if (t >= 1) wiping = false;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    function onResize() { measure(); }
    window.addEventListener("resize", onResize);
    measure();
    if (reduce) { WIPE_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      input.removeEventListener("change", onChange);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <label className={styles.cbw + " " + styles.isDemo} ref={rootRef}>
        <input type="checkbox" className={styles.cbwInput} ref={inputRef} />
        <span className={styles.cbwCard} ref={cardRef}>
          <span className={styles.cbwFill} ref={fillRef} aria-hidden="true" />
          <span className={styles.cbwBox} aria-hidden="true">
            <svg viewBox="0 0 20 20" width={14} height={14}>
              <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.cbwText}>알림 카드 선택</span>
        </span>
      </label>
    </main>
  );
}
