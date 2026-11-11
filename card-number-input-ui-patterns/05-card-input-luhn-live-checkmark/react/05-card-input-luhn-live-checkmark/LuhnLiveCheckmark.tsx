import { useEffect, useRef } from "react";
import styles from "./LuhnLiveCheckmark.module.scss";

type Box<T> = { current: T };

const CHECK_PATH = "M4 10.5l3.5 3.5L16 5.5";

export default function LuhnLiveCheckmark() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const badge = root.querySelector(`.${styles.badge}`) as HTMLElement | null;
    const sumLabel = root.querySelector(`.${styles.sum}`) as HTMLElement | null;
    if (!input || !badge || !sumLabel) return;

    // 계산 겹: 자리별 가중 합(오른쪽부터 한 자리씩 건너 2배) — 룬 체크섬을 매 입력마다 다시 계산한다.
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

    function paint(digits: string) {
      const sum = digits.length ? luhnSum(digits) : 0;
      const valid = digits.length >= 13 && sum % 10 === 0;
      sumLabel!.textContent = "가중 합 값 " + sum;
      badge!.classList.toggle(styles["badge--on"], valid);
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      const digits = input!.value.replace(/\D/g, "").slice(0, 16);
      input!.value = digits;
      paint(digits);
    }
    input.addEventListener("input", onInput);

    // 자동 루프: 유효 번호를 한 자리씩 채웠다가, 마지막 자리를 잘못된 값으로 바꿔 무효 상태도 보여준다.
    const VALID = "9999999999999995";
    const INVALID = "9999999999999990";
    const SEQ: string[] = [];
    for (let i = 0; i <= VALID.length; i++) SEQ.push(VALID.slice(0, i));
    SEQ.push(INVALID);
    SEQ.push(VALID);
    for (let k = VALID.length - 1; k >= 0; k--) SEQ.push(VALID.slice(0, k));
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      const digits = SEQ[si];
      input!.value = digits;
      paint(digits);
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 180); autoTick(); }
    else { autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.cl} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={16} defaultValue="" />
        <span className={styles.badge}>
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
            <path className={styles.check} d={CHECK_PATH} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
          </svg>
        </span>
      </label>
      <div className={styles.sum}>가중 합 값 0</div>
    </div>
  );
}
