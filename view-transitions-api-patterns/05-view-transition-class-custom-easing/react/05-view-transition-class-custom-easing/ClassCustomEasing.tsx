// ClassCustomEasing — vanilla 판(run/401/demo/05-view-transition-class-custom-easing/index.html) 의 React 포트.
// 계산 겹 없음(브리프 지정) — view-transition-class 로 요소군마다 다른 이징을 묶어 지정한다.
import { useEffect, useRef } from "react";
import styles from "./ClassCustomEasing.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 1000;

export default function ClassCustomEasing() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const btnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let wide = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render() {
      rootRef.current?.classList.toggle(styles.isWide, wide);
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function toggle() {
      wide = !wide;
      change(render);
    }

    function onClick() { human(); toggle(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { human(); e.preventDefault(); toggle(); }
    }

    btnRef.current?.addEventListener("click", onClick);
    rootRef.current?.addEventListener("keydown", onKeydown);

    function loop() {
      if (!isDemo) return;
      toggle();
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

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
      <div className={styles.ce + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.hero} />
        <button type="button" className={styles.btn} ref={btnRef} aria-label="배치 전환 — 배경은 느리게 버튼은 빠르게">전환</button>
      </div>
    </main>
  );
}
