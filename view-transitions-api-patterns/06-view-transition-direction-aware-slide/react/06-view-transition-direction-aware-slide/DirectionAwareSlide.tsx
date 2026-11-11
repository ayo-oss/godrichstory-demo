// DirectionAwareSlide — vanilla 판(run/401/demo/06-view-transition-direction-aware-slide/index.html) 의 React 포트.
// 계산 겹: 다음 인덱스 - 현재 인덱스의 부호만 취해 이동 방향 값을 얻는다 (+1 앞으로 · -1 뒤로).
import { useEffect, useRef } from "react";
import styles from "./DirectionAwareSlide.module.scss";

type Box<T> = { current: T };

const STEPS = ["주소 입력", "결제 값 확인", "수령 방법", "완료"];
const SEQ = [1, 2, 3, 2, 1, 0];
const HOLD_MS = 900;

export default function DirectionAwareSlide() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const numRef = useRef(null) as unknown as Box<HTMLElement>;
  const tRef = useRef(null) as unknown as Box<HTMLElement>;
  const dotRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const prevBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const nextBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let idx = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render(newIdx: number) {
      if (numRef.current) numRef.current.textContent = String(newIdx + 1);
      if (tRef.current) tRef.current.textContent = STEPS[newIdx];
      dotRefs.current.forEach((d, i) => d?.classList.toggle(styles.isActive, i === newIdx));
      idx = newIdx;
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function goto(newIdx: number) {
      if (newIdx === idx || newIdx < 0 || newIdx > 3) return;
      const dir = Math.sign(newIdx - idx) || 1;
      document.documentElement.style.setProperty("--dir", String(dir));
      change(() => render(newIdx));
    }

    function onNext() { human(); goto(idx + 1 > 3 ? 0 : idx + 1); }
    function onPrev() { human(); goto(idx - 1 < 0 ? 3 : idx - 1); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { human(); goto(idx + 1 > 3 ? 0 : idx + 1); }
      else if (e.key === "ArrowLeft") { human(); goto(idx - 1 < 0 ? 3 : idx - 1); }
    }

    nextBtnRef.current?.addEventListener("click", onNext);
    prevBtnRef.current?.addEventListener("click", onPrev);
    rootRef.current?.addEventListener("keydown", onKeydown);

    let si = 0;
    function loop() {
      if (!isDemo) return;
      goto(SEQ[si % SEQ.length]);
      si++;
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      nextBtnRef.current?.removeEventListener("click", onNext);
      prevBtnRef.current?.removeEventListener("click", onPrev);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.dots}>
          <span className={styles.dot + " " + styles.isActive} ref={(el: HTMLSpanElement | null) => { dotRefs.current[0] = el; }} />
          <span className={styles.dot} ref={(el: HTMLSpanElement | null) => { dotRefs.current[1] = el; }} />
          <span className={styles.dot} ref={(el: HTMLSpanElement | null) => { dotRefs.current[2] = el; }} />
          <span className={styles.dot} ref={(el: HTMLSpanElement | null) => { dotRefs.current[3] = el; }} />
        </div>
        <div className={styles.panel}>
          <p className={styles.num} ref={numRef}>1</p>
          <p className={styles.t} ref={tRef}>주소 입력</p>
        </div>
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} ref={prevBtnRef} aria-label="이전 단계">이전</button>
          <button type="button" className={styles.navBtn} ref={nextBtnRef} aria-label="다음 단계">다음</button>
        </div>
      </div>
    </main>
  );
}
