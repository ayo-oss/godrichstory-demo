// GroupNested — vanilla 판(run/401/demo/04-view-transition-group-nested/index.html) 의 React 포트.
// 계산 겹 없음(브리프 지정) — view-transition-group: nearest 로 부모·자식이 중첩 그룹을 이룬다.
import { useEffect, useRef } from "react";
import styles from "./GroupNested.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 1000;

export default function GroupNested() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let open = false;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function render() {
      cardRef.current?.classList.toggle(styles.isOpen, open);
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function toggle() {
      open = !open;
      change(render);
    }

    function onClick() { human(); toggle(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { human(); e.preventDefault(); toggle(); }
    }

    cardRef.current?.addEventListener("click", onClick);
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
      cardRef.current?.removeEventListener("click", onClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gn + " " + styles.isDemo} ref={rootRef}>
        <button type="button" className={styles.card} ref={cardRef} aria-label="카드 펼치기">
          <span className={styles.thumb} />
          <span className={styles.title}>묶음 카드</span>
        </button>
      </div>
    </main>
  );
}
