import { useEffect, useRef } from "react";
import styles from "./TableRowGroupCollapse.module.scss";

type Box<T> = { current: T };

export default function TableRowGroupCollapse() {
  const rootRef = useRef(null) as unknown as Box<HTMLTableElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const group = root.querySelector(`.${styles.group}`) as HTMLElement | null;
    const children = [0, 1, 2].map((i) => root.querySelector(`.${styles["child" + i]}`) as HTMLElement | null);
    if (!group || children.some((el) => !el)) return;

    // 상수: 자식 행 높이(px) · 자식 사이 stagger 간격(ms) · 자동 루프 간격
    const CHILD_H = 30;
    const STAGGER_MS = 70;
    const AUTO_TOGGLE_MS = 1300;

    let collapsed = false;
    let stopped = false;
    let autoTimer = 0;

    function apply() {
      children.forEach((el, i) => {
        const delay = i * STAGGER_MS;
        el!.style.transitionDelay = delay + "ms";
        if (collapsed) {
          el!.style.height = "0px";
          el!.style.opacity = "0";
          el!.style.transform = "translateY(-" + (CHILD_H * 0.3).toFixed(1) + "px)";
        } else {
          el!.style.height = CHILD_H + "px";
          el!.style.opacity = "1";
          el!.style.transform = "translateY(0px)";
        }
      });
      group!.classList.toggle(styles["group--collapsed"], collapsed);
    }
    apply();

    function toggle() {
      collapsed = !collapsed;
      apply();
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      toggle();
    }
    group.addEventListener("click", onClick);

    function autoStep() {
      if (stopped) return;
      if (root!.classList.contains(styles["is-demo"])) toggle();
      autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);
    }
    autoTimer = window.setTimeout(autoStep, AUTO_TOGGLE_MS);

    return () => {
      stopped = true;
      window.clearTimeout(autoTimer);
      group.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <table ref={rootRef} className={`${styles.stage} ${styles.tgc} ${styles["is-demo"]}`}>
      <tbody>
        <tr className={styles.group}>
          <td colSpan={2}>과일 그룹 (3)</td>
        </tr>
        <tr className={`${styles.child} ${styles.child0}`}>
          <td className={styles.cell}>사과</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>120</td>
        </tr>
        <tr className={`${styles.child} ${styles.child1}`}>
          <td className={styles.cell}>바나나</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>80</td>
        </tr>
        <tr className={`${styles.child} ${styles.child2}`}>
          <td className={styles.cell}>포도</td>
          <td className={`${styles.cell} ${styles.cellNum}`}>45</td>
        </tr>
      </tbody>
    </table>
  );
}
