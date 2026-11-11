import { useEffect, useRef } from "react";
import styles from "./PasswordRevealMultiFieldSyncToggle.module.scss";

type Box<T> = { current: T };

const SYNC_EYE_MORPH_MS = 260;
const LABEL_SHOW = "비밀번호 표시";
const LABEL_HIDE = "비밀번호 숨기기";

export default function PasswordRevealMultiFieldSyncToggle() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const formRef = useRef(null) as unknown as Box<HTMLFormElement | null>;
  const inputARef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const inputBRef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const toggleARef = useRef(null) as unknown as Box<HTMLButtonElement | null>;
  const toggleBRef = useRef(null) as unknown as Box<HTMLButtonElement | null>;
  const lidTopARef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const lidBottomARef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const pupilARef = useRef(null) as unknown as Box<SVGCircleElement | null>;
  const lidTopBRef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const lidBottomBRef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const pupilBRef = useRef(null) as unknown as Box<SVGCircleElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const form = formRef.current;
    const inputA = inputARef.current;
    const inputB = inputBRef.current;
    const toggleA = toggleARef.current;
    const toggleB = toggleBRef.current;
    const lidTopA = lidTopARef.current;
    const lidBottomA = lidBottomARef.current;
    const pupilA = pupilARef.current;
    const lidTopB = lidTopBRef.current;
    const lidBottomB = lidBottomBRef.current;
    const pupilB = pupilBRef.current;
    if (!root || !form || !inputA || !inputB || !toggleA || !toggleB || !lidTopA || !lidBottomA || !pupilA || !lidTopB || !lidBottomB || !pupilB) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426032);
    const POOL_ALL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?-";
    function makeFakePassword() {
      const len = 8 + Math.floor(pwRand() * 5);
      let out = "";
      for (let i = 0; i < len; i += 1) out += POOL_ALL.charAt(Math.floor(pwRand() * POOL_ALL.length));
      return out;
    }
    const FAKE_PW = makeFakePassword();
    inputA.value = FAKE_PW;
    inputB.value = FAKE_PW;

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function paintEyes(progress: number) {
      const eased = easeOutCubic(progress);
      const topY = 12 - 8 * eased;
      const botY = 12 + 8 * eased;
      const d1 = "M2,12 Q12," + topY + " 22,12";
      const d2 = "M2,12 Q12," + botY + " 22,12";
      lidTopA!.setAttribute("d", d1);
      lidBottomA!.setAttribute("d", d2);
      pupilA!.style.opacity = String(eased);
      lidTopB!.setAttribute("d", d1);
      lidBottomB!.setAttribute("d", d2);
      pupilB!.style.opacity = String(eased);
    }

    let eyeProgress = 0;
    let eyeRaf = 0;
    let animT0: number | null = null;
    let animStart = 0;
    let animTarget = 0;
    paintEyes(eyeProgress);

    function animateEyeStep(ts: number) {
      if (animT0 === null) animT0 = ts;
      const elapsed = ts - animT0;
      const p = Math.min(1, elapsed / SYNC_EYE_MORPH_MS);
      eyeProgress = animStart + (animTarget - animStart) * p;
      paintEyes(eyeProgress);
      if (p < 1) { eyeRaf = requestAnimationFrame(animateEyeStep); }
      else { eyeRaf = 0; eyeProgress = animTarget; paintEyes(eyeProgress); }
    }
    function animateEyeTo(target: number) {
      if (eyeRaf) { cancelAnimationFrame(eyeRaf); eyeRaf = 0; }
      if (reduce) { eyeProgress = target; paintEyes(eyeProgress); return; }
      animStart = eyeProgress;
      animTarget = target;
      animT0 = null;
      eyeRaf = requestAnimationFrame(animateEyeStep);
    }

    let revealed = false;
    function setRevealed(next: boolean) {
      revealed = next;
      const type = revealed ? "text" : "password";
      inputA!.type = type;
      inputB!.type = type;
      root!.classList.toggle(styles["is-revealed"], revealed);
      const label = revealed ? LABEL_HIDE : LABEL_SHOW;
      toggleA!.setAttribute("aria-pressed", String(revealed));
      toggleA!.setAttribute("aria-label", label);
      toggleB!.setAttribute("aria-pressed", String(revealed));
      toggleB!.setAttribute("aria-label", label);
      animateEyeTo(revealed ? 1 : 0);
    }

    function onToggle() {
      root!.classList.remove(styles["is-demo"]);
      setRevealed(!revealed);
    }
    toggleA.addEventListener("click", onToggle);
    toggleB.addEventListener("click", onToggle);

    function onSubmit(e: Event) { e.preventDefault(); }
    form.addEventListener("submit", onSubmit);

    if (reduce) { root.classList.remove(styles["is-demo"]); }

    let loopTimer = 0;
    let closeTimer = 0;
    function demoLoop() {
      if (reduce) return;
      setRevealed(true);
      closeTimer = window.setTimeout(function () { setRevealed(false); }, 900);
      loopTimer = window.setTimeout(demoLoop, 2000);
    }
    let startTimer = 0;
    if (!reduce) { startTimer = window.setTimeout(demoLoop, 220); }

    return () => {
      toggleA.removeEventListener("click", onToggle);
      toggleB.removeEventListener("click", onToggle);
      form.removeEventListener("submit", onSubmit);
      if (eyeRaf) cancelAnimationFrame(eyeRaf);
      window.clearTimeout(startTimer);
      window.clearTimeout(loopTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.pfs} ${styles["is-demo"]}`}>
        <form ref={formRef} className={styles.form} noValidate>
          <label className={styles.field}>
            <span className={styles.labelText}>비밀번호</span>
            <span className={styles.inputWrap}>
              <input
                ref={inputARef}
                className={styles.input}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                defaultValue=""
              />
              <button ref={toggleARef} className={styles.toggle} type="button" aria-pressed="false" aria-label="비밀번호 표시">
                <svg className={styles.eye} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
                  <path ref={lidTopARef} d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path ref={lidBottomARef} d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <circle ref={pupilARef} cx={12} cy={12} r={3.2} fill="currentColor" />
                </svg>
              </button>
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.labelText}>비밀번호 확인</span>
            <span className={styles.inputWrap}>
              <input
                ref={inputBRef}
                className={styles.input}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                defaultValue=""
              />
              <button ref={toggleBRef} className={styles.toggle} type="button" aria-pressed="false" aria-label="비밀번호 표시">
                <svg className={styles.eye} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
                  <path ref={lidTopBRef} d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path ref={lidBottomBRef} d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <circle ref={pupilBRef} cx={12} cy={12} r={3.2} fill="currentColor" />
                </svg>
              </button>
            </span>
          </label>
          <p className={styles.hint}>두 칸은 하나의 상태를 공유합니다</p>
        </form>
      </div>
    </main>
  );
}
