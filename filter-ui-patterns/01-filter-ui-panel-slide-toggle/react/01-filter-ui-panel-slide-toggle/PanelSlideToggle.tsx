import { useEffect, useRef } from "react";
import styles from "./PanelSlideToggle.module.scss";

// 필터 패널 열림닫힘을 하나의 불(boolean) 값으로만 들고, 그 값을 transform 위치(0 또는 -100%)로 바꿔 CSS transition 이 보간한다.
// 계산 겹: 열림 여부 -> translateX 보간(transition). 실사용 클릭 리스너 있음.
export default function PanelSlideToggle() {
  const stageRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!stage || !trigger || !panel) return;

    function setOpen(open: boolean) {
      stage!.classList.toggle(styles["is-open"], open);
      trigger!.setAttribute("aria-expanded", String(open));
      panel!.setAttribute("aria-hidden", String(!open));
    }

    function onClick() {
      panel!.classList.remove(styles["is-demo"]);
      setOpen(!stage!.classList.contains(styles["is-open"]));
    }

    trigger.addEventListener("click", onClick);
    return () => {
      trigger.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main ref={stageRef} className={styles.stage}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-expanded="false"
        aria-controls="panel"
      >
        필터 열기
      </button>
      <aside ref={panelRef} className={`${styles.panel} ${styles["is-demo"]}`} aria-hidden="true">
        <p className={styles.panel__title}>필터</p>
        <div className={styles.panel__row}>
          <span className={styles.chip}>색상</span>
          <span className={styles.chip}>사이즈</span>
        </div>
        <div className={styles.panel__row}>
          <span className={styles.chip}>가격대</span>
          <span className={styles.chip}>소재</span>
        </div>
      </aside>
    </main>
  );
}
