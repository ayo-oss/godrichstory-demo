import { useEffect, useRef } from "react";
import styles from "./ExpiryAutoSlash.module.scss";

type Box<T> = { current: T };

type Built = { display: string; mm: string; yy: string; slashOn: boolean; clamped: boolean };

export default function ExpiryAutoSlash() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const mmChip = root.querySelector(`.${styles.mm}`) as HTMLElement | null;
    const yyChip = root.querySelector(`.${styles.yy}`) as HTMLElement | null;
    const slash = root.querySelector(`.${styles.slash}`) as HTMLElement | null;
    if (!input || !mmChip || !yyChip || !slash) return;

    // 계산 겹: 월 값의 범위를 01~12 로 clamp 하고, 월 자릿수 값이 2자리를 채우면
    // 구분자(슬래시) 값을 자동으로 끼운다.
    function digitsOnly(str: string) { return str.replace(/\D/g, "").slice(0, 4); }

    function build(rawDigits: string): Built {
      let mm = rawDigits.slice(0, 2);
      const yy = rawDigits.slice(2, 4);
      let clamped = false;
      if (mm.length === 2) {
        const n = parseInt(mm, 10);
        if (n === 0) { mm = "01"; clamped = true; }
        else if (n > 12) { mm = "12"; clamped = true; }
      }
      const slashOn = mm.length === 2;
      return { display: mm + (slashOn ? "/" : "") + yy, mm, yy, slashOn, clamped };
    }

    function pulse(el: HTMLElement) {
      el.classList.remove(styles["chip--pulse"]);
      void el.offsetWidth;
      el.classList.add(styles["chip--pulse"]);
    }

    function paint(r: Built) {
      mmChip!.textContent = r.mm || "MM";
      mmChip!.classList.toggle(styles["chip--on"], r.mm.length > 0);
      yyChip!.textContent = r.yy || "YY";
      yyChip!.classList.toggle(styles["chip--on"], r.yy.length > 0);
      slash!.classList.toggle(styles["slash--on"], r.slashOn);
      if (r.clamped) pulse(mmChip!);
    }

    function digitsBefore(str: string, upto: number) {
      return str.slice(0, upto).replace(/\D/g, "").length;
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      const prevDigits = digitsBefore(input!.value, input!.selectionStart || 0);
      const rawDigits = digitsOnly(input!.value);
      const r = build(rawDigits);
      input!.value = r.display;
      const newCaret = Math.min(prevDigits + (r.slashOn && prevDigits >= 2 ? 1 : 0), input!.value.length);
      input!.setSelectionRange(newCaret, newCaret);
      paint(r);
    }
    input.addEventListener("input", onInput);

    // 자동 루프: 시드 고정 자릿수 값 — "13" 을 쳐서 월 범위 clamp("12")가 걸리는 장면 포함.
    const SEQ = ["", "1", "13", "132", "1329", "132", "13", "1", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      const rawDigits = SEQ[si];
      const r = build(rawDigits);
      input!.value = r.display;
      paint(r);
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 340); autoTick(); }
    else { autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ce} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={5} defaultValue="" placeholder="MM/YY" />
      </label>
      <div className={styles.chips} aria-hidden="true">
        <span className={`${styles.chip} ${styles.mm}`}>MM</span>
        <span className={styles.slash}>/</span>
        <span className={`${styles.chip} ${styles.yy}`}>YY</span>
      </div>
    </div>
  );
}
