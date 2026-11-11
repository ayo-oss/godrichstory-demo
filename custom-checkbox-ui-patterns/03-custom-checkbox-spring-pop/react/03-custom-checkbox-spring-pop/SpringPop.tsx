// SpringPop — vanilla 판(run/368/demo/03-custom-checkbox-spring-pop/index.html) 의 React 포트.
// 감쇠 코사인 진동(exp(-SPRING_ZETA·t)·cos(POP_FREQ·t))을 매 프레임 계산해 scale() 값을 만든다.
import { useEffect, useRef } from "react";
import styles from "./SpringPop.module.scss";

type Box<T> = { current: T };

export default function SpringPop() {
  const rootRef = useRef(null) as unknown as Box<HTMLLabelElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const boxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    let POP_MS = 480; // 계산 겹 상수: 스프링 튐이 잦아드는 데 걸리는 실제 시간(ms)
    const SPRING_ZETA = 3.4; // 계산 겹: 감쇠 상수 — 낮을수록 더 오래 튕긴다
    const SCALE_OVERSHOOT = 0.34; // 계산 겹: 목표(scale 1)를 넘어서는 최대 배율
    const POP_FREQ = (2 * Math.PI * 2.1) / POP_MS; // 계산 겹: 튐 각속도
    const CYCLE_MS = 900; // 자동 루프가 체크·해제를 오가는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const input = inputRef.current;
    const box = boxRef.current;
    if (!root || !input || !box) return;

    let isDemo = true;
    let popStart = -99999;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function popScale(t: number) {
      // 계산 겹: 감쇠 코사인 진동 — t=0 에서 SCALE_OVERSHOOT 만큼 튀어 오른 뒤 1로 잦아든다
      if (t < 0 || t > POP_MS) return 1;
      const amp = Math.exp(-SPRING_ZETA * (t / POP_MS));
      return 1 + amp * SCALE_OVERSHOOT * Math.cos(POP_FREQ * t);
    }

    function setChecked(next: boolean, ts: number) {
      input!.checked = next;
      box!.classList.toggle(styles.boxOn, next);
      popStart = ts;
    }

    function onChange() { human(); setChecked(input!.checked, performance.now()); }
    input.addEventListener("change", onChange);

    let cycleStart = 0;
    let lastState = false;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) { lastState = step; setChecked(step, ts); }
      }

      const s = popScale(ts - popStart);
      box!.style.transform = "scale(" + s.toFixed(3) + ")";

      rafRef.current = requestAnimationFrame(loop);
    }

    if (reduce) { POP_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      input.removeEventListener("change", onChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <label className={styles.cbs + " " + styles.isDemo} ref={rootRef}>
        <input type="checkbox" className={styles.cbsInput} ref={inputRef} />
        <span className={styles.cbsBox} ref={boxRef} aria-hidden="true">
          <svg className={styles.cbsSvg} viewBox="0 0 20 20" width={14} height={14}>
            <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.cbsText}>미션 완료</span>
      </label>
    </main>
  );
}
