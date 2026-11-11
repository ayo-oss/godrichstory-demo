// ErrorShakeRequired — vanilla 판(run/368/demo/07-custom-checkbox-error-shake-required/index.html)
// 의 React 포트. 감쇠 사인 진동(exp(-SHAKE_ZETA·t)·sin(SHAKE_FREQ·t))을 직접 계산해 translateX
// 값으로 삼는다 — 트윈 하나로 끝내지 않고 매 프레임 진폭이 줄어드는 물리량을 적분한다.
import { useEffect, useRef } from "react";
import styles from "./ErrorShakeRequired.module.scss";

type Box<T> = { current: T };

export default function ErrorShakeRequired() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const rowRef = useRef(null) as unknown as Box<HTMLLabelElement>;
  const hintRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const submitRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    let SHAKE_MS = 420; // 계산 겹 상수: 흔들림 감쇠가 끝나는 데 걸리는 실제 시간(ms)
    const SHAKE_FREQ = (2 * Math.PI * 5) / SHAKE_MS; // 흔들림 진동 주파수
    const SHAKE_ZETA = 4.2; // 감쇠 계수
    const SHAKE_AMP = 8; // px, 최대 흔들림 폭
    const CYCLE_MS = 480;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const input = inputRef.current;
    const row = rowRef.current;
    const hint = hintRef.current;
    const submit = submitRef.current;
    if (!root || !input || !row || !hint || !submit) return;

    let isDemo = true;
    let shaking = false, shakeStart = 0;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function shakeOffset(t: number) {
      // 계산 겹: 감쇠 사인 진동 — 시간이 지날수록 진폭이 줄어드는 흔들림 값을 직접 계산
      const amp = Math.exp(-SHAKE_ZETA * (t / SHAKE_MS));
      return SHAKE_AMP * amp * Math.sin(SHAKE_FREQ * t);
    }

    function triggerError() {
      row!.classList.add(styles.rowError);
      hint!.classList.add(styles.hintError);
      shakeStart = performance.now();
      shaking = true;
    }

    function clearError() {
      row!.classList.remove(styles.rowError);
      hint!.classList.remove(styles.hintError);
    }

    function onInputChange() { human(); if (input!.checked) clearError(); }
    input.addEventListener("change", onInputChange);

    function onSubmitClick() {
      human();
      if (!input!.checked) { triggerError(); } else { clearError(); }
    }
    submit.addEventListener("click", onSubmitClick);

    let cycleStart = 0;
    let lastStep = -1;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 3;
        if (step !== lastStep) {
          lastStep = step;
          if (step === 0) { input!.checked = false; clearError(); }
          else if (step === 1) { triggerError(); }
          else { input!.checked = true; clearError(); }
        }
      }

      if (shaking) {
        const t = ts - shakeStart;
        if (t >= SHAKE_MS) {
          shaking = false;
          row!.style.transform = "";
        } else {
          row!.style.transform = "translateX(" + shakeOffset(t).toFixed(2) + "px)";
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    if (reduce) { SHAKE_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      input.removeEventListener("change", onInputChange);
      submit.removeEventListener("click", onSubmitClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cbe + " " + styles.isDemo} ref={rootRef}>
        <label className={styles.cbeRow} ref={rowRef}>
          <input type="checkbox" className={styles.cbeInput} ref={inputRef} required />
          <span className={styles.cbeBox} aria-hidden="true">
            <svg viewBox="0 0 20 20" width={14} height={14}>
              <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.cbeText}>필수 약관에 동의합니다</span>
        </label>
        <p className={styles.cbeHint} ref={hintRef}>체크해야 다음으로 진행됩니다</p>
        <button type="button" className={styles.cbeSubmit} ref={submitRef}>제출</button>
      </div>
    </main>
  );
}
