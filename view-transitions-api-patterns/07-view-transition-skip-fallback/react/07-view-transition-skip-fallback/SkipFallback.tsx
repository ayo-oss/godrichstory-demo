// SkipFallback — vanilla 판(run/401/demo/07-view-transition-skip-fallback/index.html) 의 React 포트.
// 이 함수가 규칙의 핵심이다: 지원 여부 값을 먼저 확인하고(SUPPORTS_VT), 시뮬레이션으로
// "지원하지 않는 환경"을 흉내 낼 때는 지원 여부와 무관하게 즉시 전환(대체) 경로로 물러난다.
import { useEffect, useRef } from "react";
import styles from "./SkipFallback.module.scss";

type Box<T> = { current: T };

const STATES = ["01", "02", "03"];
const HOLD_MS = 600;

export default function SkipFallback() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const numRef = useRef(null) as unknown as Box<HTMLElement>;
  const supportRef = useRef(null) as unknown as Box<HTMLElement>;
  const pathRef = useRef(null) as unknown as Box<HTMLElement>;
  const btnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let si = 0;
    // 데모 전용: 실제로는 지원하는 환경이지만, 지원하지 않는 환경의 물러나는 경로를 눈에 보이도록
    // 번갈아 흉내 낸다. 판정 코드 자체는 실제 SUPPORTS_VT 값을 그대로 쓴다.
    let simulateUnsupported = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function renderLabels(usedTransition: boolean) {
      if (supportRef.current) supportRef.current.textContent = simulateUnsupported ? "지원 값 아니오" : "지원 값 예";
      if (pathRef.current) {
        pathRef.current.textContent = usedTransition ? "전환 사용" : "즉시 전환(대체)";
        pathRef.current.classList.toggle(styles.isFallback, !usedTransition);
      }
    }

    function applyState() {
      si = (si + 1) % STATES.length;
      if (numRef.current) numRef.current.textContent = STATES[si];
      cardRef.current?.classList.toggle(styles.isAlt, si % 2 === 1);
    }

    function step() {
      const willUseTransition = SUPPORTS_VT && !simulateUnsupported;
      if (willUseTransition) {
        document.startViewTransition(applyState);
      } else {
        applyState();
      }
      renderLabels(willUseTransition);
    }

    function onClick() { human(); simulateUnsupported = !simulateUnsupported; step(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { human(); e.preventDefault(); simulateUnsupported = !simulateUnsupported; step(); }
    }

    btnRef.current?.addEventListener("click", onClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      simulateUnsupported = !simulateUnsupported;
      step();
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    renderLabels(SUPPORTS_VT);
    if (!reduce) {
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
      <div className={styles.sf + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.card} ref={cardRef}>
          <p className={styles.num} ref={numRef}>01</p>
        </div>
        <p className={styles.meta}>
          <span className={styles.pill} ref={supportRef}>지원 값 예</span>
          <span className={styles.pill + " " + styles.pillPath} ref={pathRef}>전환 사용</span>
        </p>
        <button type="button" className={styles.btn} ref={btnRef} aria-label="지원 여부 값을 뒤집어 경로 전환">환경 뒤집기</button>
      </div>
    </main>
  );
}
