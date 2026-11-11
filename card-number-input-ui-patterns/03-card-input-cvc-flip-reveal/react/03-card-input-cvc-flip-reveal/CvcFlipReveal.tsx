import { useEffect, useRef } from "react";
import styles from "./CvcFlipReveal.module.scss";

type Box<T> = { current: T };

export default function CvcFlipReveal() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const card = root.querySelector(`.${styles.card}`) as HTMLElement | null;
    const box = root.querySelector(`.${styles.cvcBox}`) as HTMLElement | null;
    if (!input || !card || !box) return;

    // 계산 겹: 초점 값 on/off 에 따라 카드의 3D 회전 각 값이 스프링 곡선($ease-lerp-settle)을
    // 타고 180deg 를 넘겼다가 되돌아와 정착한다 — 등속 회전이 아니라 관성 있는 회전.
    function setFlipped(on: boolean) { card!.classList.toggle(styles["card--flipped"], on); }

    function onFocus() { root!.classList.remove(styles["is-demo"]); stopAutoplay(); setFlipped(true); }
    function onBlur() { setFlipped(false); }
    function onInput() {
      box!.textContent = (input!.value.replace(/\D/g, "").slice(0, 3) || "").padEnd(3, "•");
    }
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    input.addEventListener("input", onInput);

    // 자동 루프: 초점 on/off 를 시드 간격으로 오간다.
    const SEQ = [true, true, false, false];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      const on = SEQ[si];
      setFlipped(on);
      input!.classList.toggle(styles["input--focus"], on);
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 900); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cv} ${styles["is-demo"]}`}>
      <div className={styles.scene}>
        <div className={styles.card}>
          <div className={`${styles.face} ${styles["face--front"]}`}>
            <span className={styles.chipIcon} />
            <span className={styles.num}>9999 99•• •••• 9995</span>
            <span className={styles.exp}>12/29</span>
          </div>
          <div className={`${styles.face} ${styles["face--back"]}`}>
            <span className={styles.strip} />
            <span className={styles.cvcRow}><span className={styles.cvcBox}>•••</span></span>
          </div>
        </div>
      </div>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={3} placeholder="CVC" />
      </label>
    </div>
  );
}
