import { useEffect, useRef } from "react";
import styles from "./SuccessGlowLock.module.scss";

type Box<T> = { current: T };

const GLOW_MS = 900; // 계산 겹: 빛남 값이 3번 펄스로 잦아드는 데 걸리는 시간(감쇠 포락선)

export default function SuccessGlowLock() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector(`.${styles.field}`) as HTMLElement | null;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const glow = root.querySelector(`.${styles.glow}`) as HTMLElement | null;
    if (!field || !input || !glow) return;

    function luhnSum(digits: string) {
      let sum = 0, dbl = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let d = digits.charCodeAt(i) - 48;
        if (dbl) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        dbl = !dbl;
      }
      return sum;
    }

    let lockHandle: number | null = null;
    function tryLock() {
      const digits = input!.value.replace(/\D/g, "");
      if (digits.length === 16 && luhnSum(digits) % 10 === 0) {
        glow!.classList.remove(styles["glow--on"]);
        void glow!.offsetWidth;
        glow!.classList.add(styles["glow--on"]);
        lockHandle = window.setTimeout(function () {
          field!.classList.add(styles["field--locked"]);
          input!.setAttribute("readonly", "readonly");
        }, GLOW_MS);
      }
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      input!.value = input!.value.replace(/\D/g, "").slice(0, 16);
      tryLock();
    }
    input.addEventListener("input", onInput);

    // 자동 루프: 유효 번호를 채워 빛남 → 잠금까지 보여준 뒤 리셋한다.
    const VALID = "9999999999999995";
    let stopped = false;
    let handle: number | null = null;
    function stopAutoplay() {
      stopped = true;
      if (handle !== null) { window.clearTimeout(handle); handle = null; }
      if (lockHandle !== null) { window.clearTimeout(lockHandle); lockHandle = null; }
    }
    function typeStep(i: number) {
      if (stopped) return;
      input!.value = VALID.slice(0, i);
      if (i < VALID.length) { handle = window.setTimeout(function () { typeStep(i + 1); }, 90); }
      else { tryLock(); handle = window.setTimeout(reset, GLOW_MS + 1400); }
    }
    function reset() {
      if (stopped) return;
      field!.classList.remove(styles["field--locked"]);
      input!.removeAttribute("readonly");
      input!.value = "";
      handle = window.setTimeout(function () { typeStep(0); }, 260);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { typeStep(0); }
    else {
      input.value = VALID;
      field.classList.add(styles["field--locked"]);
      input.setAttribute("readonly", "readonly");
    }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cg} ${styles["is-demo"]}`}>
      <div className={styles.field}>
        <span className={styles.glow} aria-hidden="true" />
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={16} defaultValue="" />
        <span className={styles.icon}>
          <svg className={styles.open} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M6 9V6.5a4 4 0 0 1 7.5-1.9" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            <rect x={4} y={9} width={9} height={7} rx={1.6} fill="none" stroke="currentColor" strokeWidth={1.8} />
          </svg>
          <svg className={styles.closed} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            <rect x={4.5} y={9} width={11} height={7.5} rx={1.6} fill="none" stroke="currentColor" strokeWidth={1.8} />
          </svg>
        </span>
      </div>
    </div>
  );
}
