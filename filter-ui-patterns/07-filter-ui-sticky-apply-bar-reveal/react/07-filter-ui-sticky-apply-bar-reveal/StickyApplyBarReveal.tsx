import { useEffect, useRef } from "react";
import styles from "./StickyApplyBarReveal.module.scss";

// 필터가 하나라도 선택되어 있는지(불 값)만 보고 바 위치를 translateY 로 보간한다.
// 실제 체크박스 변경: classList.toggle 로 has-selection 상태를 뒤집는다.
export default function StickyApplyBarReveal() {
  const stageRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const input0Ref = useRef<HTMLInputElement>(null);
  const input1Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const bar = barRef.current;
    const inputs = [input0Ref.current, input1Ref.current].filter(
      (x): x is HTMLInputElement => x !== null
    );
    if (!stage || !bar || inputs.length === 0) return;

    function sync() {
      bar!.classList.remove(styles["is-demo"]);
      const anySelected = inputs.some((input) => input.checked);
      stage!.classList.toggle(styles["has-selection"], anySelected);
    }

    inputs.forEach((input) => input.addEventListener("change", sync));
    return () => {
      inputs.forEach((input) => input.removeEventListener("change", sync));
    };
  }, []);

  return (
    <main ref={stageRef} className={styles.stage}>
      <div className={styles.options}>
        <label className={styles.option}>
          <input ref={input0Ref} className={styles.option__input} type="checkbox" /> 무료 배송
        </label>
        <label className={styles.option}>
          <input ref={input1Ref} className={styles.option__input} type="checkbox" /> 당일 출고
        </label>
      </div>
      <div ref={barRef} className={`${styles["apply-bar"]} ${styles["is-demo"]}`}>
        <span className={styles["apply-bar__label"]}>2개 선택됨</span>
        <button className={styles["apply-bar__btn"]} type="button">
          적용하기
        </button>
      </div>
    </main>
  );
}
