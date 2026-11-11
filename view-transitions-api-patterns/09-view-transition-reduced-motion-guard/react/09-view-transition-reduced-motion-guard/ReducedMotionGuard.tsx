// ReducedMotionGuard — vanilla 판(run/401/demo/09-view-transition-reduced-motion-guard/index.html) 의 React 포트.
// 계산 겹: 실제 동작 줄임 값과 시연용 값을 합쳐 하나의 효과값으로 만들고, 그 값에 따라
// 지속시간을 0으로 낮출지 정상값을 쓸지 결정한다 — 접근성 판단은 항상 REAL_REDUCE 를 포함한다.
import { useEffect, useRef } from "react";
import styles from "./ReducedMotionGuard.module.scss";

type Box<T> = { current: T };

const NORMAL_MS = 300;
const HOLD_MS = 480;

export default function ReducedMotionGuard() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const badgeRef = useRef(null) as unknown as Box<HTMLElement>;
  const reduceRef = useRef(null) as unknown as Box<HTMLElement>;
  const durVRef = useRef(null) as unknown as Box<HTMLElement>;
  const btnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const REAL_REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let on = true;
    // 데모 전용: 실제 환경 값(REAL_REDUCE)은 헤드리스 렌더에서 대개 꺼짐으로 읽히므로,
    // 값이 켜졌을 때의 전환 붕괴를 눈으로 보이도록 번갈아 흉내 낸다.
    let simulateReduce = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render() {
      on = !on;
      cardRef.current?.classList.toggle(styles.isOff, !on);
      if (badgeRef.current) badgeRef.current.textContent = on ? "켬" : "끔";
    }

    // 계산 겹: 실제 값과 시연 값을 합쳐 하나의 효과값을 만든다 — 접근성 판단은 항상 REAL_REDUCE 를 포함한다.
    function effectiveReduce() {
      return REAL_REDUCE || simulateReduce;
    }

    function step() {
      const reduceNow = effectiveReduce();
      const dur = reduceNow ? 0 : NORMAL_MS;
      if (reduceRef.current) reduceRef.current.textContent = reduceNow ? "동작 줄임 켜짐" : "동작 줄임 꺼짐";
      if (durVRef.current) durVRef.current.textContent = String(dur);

      if (SUPPORTS_VT && !reduceNow) {
        document.startViewTransition(render);
      } else {
        render();
      }
    }

    function onClick() { human(); simulateReduce = !simulateReduce; step(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { human(); e.preventDefault(); simulateReduce = !simulateReduce; step(); }
    }

    btnRef.current?.addEventListener("click", onClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      simulateReduce = !simulateReduce;
      step();
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (reduceRef.current) reduceRef.current.textContent = effectiveReduce() ? "동작 줄임 켜짐" : "동작 줄임 꺼짐";
    if (durVRef.current) durVRef.current.textContent = String(effectiveReduce() ? 0 : NORMAL_MS);
    if (!REAL_REDUCE) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      btnRef.current?.removeEventListener("click", onClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rg + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.card} ref={cardRef}>
          <span className={styles.badge} ref={badgeRef}>켬</span>
        </div>
        <p className={styles.meta}>
          <span className={styles.pill} ref={reduceRef}>동작 줄임 꺼짐</span>
          <span className={styles.pill}>지속시간 <b ref={durVRef}>320</b>ms</span>
        </p>
        <button type="button" className={styles.btn} ref={btnRef} aria-label="동작 줄임 값 뒤집어 보기">값 뒤집기</button>
      </div>
    </main>
  );
}
