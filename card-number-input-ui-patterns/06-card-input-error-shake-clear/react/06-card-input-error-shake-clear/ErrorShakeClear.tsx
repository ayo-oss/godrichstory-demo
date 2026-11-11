import { useEffect, useRef } from "react";
import styles from "./ErrorShakeClear.module.scss";

type Box<T> = { current: T };

const AUTO_CLEAR_MS = 700; // 계산 겹: 흔들림 애니메이션이 잦아든 뒤 입력 값을 비우는 지연

export default function ErrorShakeClear() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const field = root.querySelector(`.${styles.field}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const msg = root.querySelector(`.${styles.msg}`) as HTMLElement | null;
    if (!input || !field || !btn || !msg) return;

    function shake() {
      field!.classList.remove(styles["field--error"]);
      void field!.offsetWidth;
      field!.classList.add(styles["field--error"]);
    }

    let clearHandle: number | null = null;
    function verify() {
      const digits = input!.value.replace(/\D/g, "");
      if (digits.length === 16) {
        msg!.textContent = "";
        return true;
      }
      msg!.textContent = "16자리 값이 아닙니다";
      shake();
      clearHandle = window.setTimeout(function () {
        input!.value = "";
        msg!.textContent = "";
      }, AUTO_CLEAR_MS);
      return false;
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      input!.value = input!.value.replace(/\D/g, "").slice(0, 16);
    }
    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      verify();
    }
    input.addEventListener("input", onInput);
    btn.addEventListener("click", onClick);

    // 자동 루프: 16자리에 못 미치는 값을 타이핑해 확인 버튼을 누르면 흔들림 뒤 자동으로 지워진다.
    const TYPED = "9999";
    let stopped = false;
    let autoHandle: number | null = null;
    function stopAutoplay() {
      stopped = true;
      if (autoHandle !== null) { window.clearTimeout(autoHandle); autoHandle = null; }
      if (clearHandle !== null) { window.clearTimeout(clearHandle); clearHandle = null; }
    }
    function typeStep(i: number) {
      if (stopped) return;
      input!.value = TYPED.slice(0, i);
      if (i < TYPED.length) { autoHandle = window.setTimeout(function () { typeStep(i + 1); }, 220); }
      else { autoHandle = window.setTimeout(doVerify, 500); }
    }
    function doVerify() {
      if (stopped) return;
      verify();
      autoHandle = window.setTimeout(function () { typeStep(0); }, AUTO_CLEAR_MS + 700);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { typeStep(0); } else { input.value = TYPED; }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ck} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={16} defaultValue="" />
      </label>
      <button type="button" className={styles.btn}>확인</button>
      <p className={styles.msg} aria-live="polite"></p>
    </div>
  );
}
