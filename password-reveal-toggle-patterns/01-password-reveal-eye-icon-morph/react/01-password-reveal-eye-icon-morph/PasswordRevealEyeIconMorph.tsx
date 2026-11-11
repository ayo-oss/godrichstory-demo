import { useEffect, useRef } from "react";
import styles from "./PasswordRevealEyeIconMorph.module.scss";

type Box<T> = { current: T };

const EYE_MORPH_MS = 260;
const CHAR_STAGGER_MS = 28;
const LABEL_SHOW = "비밀번호 표시";
const LABEL_HIDE = "비밀번호 숨기기";

export default function PasswordRevealEyeIconMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const formRef = useRef(null) as unknown as Box<HTMLFormElement | null>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const overlayRef = useRef(null) as unknown as Box<HTMLSpanElement | null>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement | null>;
  const lidTopRef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const lidBottomRef = useRef(null) as unknown as Box<SVGPathElement | null>;
  const pupilRef = useRef(null) as unknown as Box<SVGCircleElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const form = formRef.current;
    const input = inputRef.current;
    const overlay = overlayRef.current;
    const toggle = toggleRef.current;
    const lidTop = lidTopRef.current;
    const lidBottom = lidBottomRef.current;
    const pupil = pupilRef.current;
    if (!root || !form || !input || !overlay || !toggle || !lidTop || !lidBottom || !pupil) return;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426012);
    const POOL_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const POOL_LOWER = "abcdefghijkmnpqrstuvwxyz";
    const POOL_DIGIT = "23456789";
    const POOL_SYMBOL = "!@#$%*?-";
    const POOL_ALL = POOL_UPPER + POOL_LOWER + POOL_DIGIT + POOL_SYMBOL;
    function makeFakePassword() {
      const len = 8 + Math.floor(pwRand() * 5);
      let out = "";
      for (let i = 0; i < len; i += 1) out += POOL_ALL.charAt(Math.floor(pwRand() * POOL_ALL.length));
      return out;
    }
    const FAKE_PW = makeFakePassword();
    input.value = FAKE_PW;

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function buildOverlay(value: string) {
      overlay!.textContent = "";
      for (let i = 0; i < value.length; i += 1) {
        const ch = document.createElement("span");
        ch.className = styles.ch;
        const delay = (i * CHAR_STAGGER_MS) + "ms";
        const mask = document.createElement("span");
        mask.className = styles.mask;
        mask.style.transitionDelay = delay;
        mask.textContent = String.fromCharCode(8226);
        const real = document.createElement("span");
        real.className = styles.char;
        real.style.transitionDelay = delay;
        real.textContent = value.charAt(i);
        ch.appendChild(mask);
        ch.appendChild(real);
        overlay!.appendChild(ch);
      }
    }
    buildOverlay(FAKE_PW);

    function onInput() { buildOverlay(input!.value); }
    input.addEventListener("input", onInput);

    let eyeProgress = 0;
    let eyeRaf = 0;
    function paintEye(progress: number) {
      const eased = easeOutCubic(progress);
      const topY = 12 - 8 * eased;
      const botY = 12 + 8 * eased;
      lidTop!.setAttribute("d", "M2,12 Q12," + topY + " 22,12");
      lidBottom!.setAttribute("d", "M2,12 Q12," + botY + " 22,12");
      pupil!.style.opacity = String(eased);
    }
    paintEye(eyeProgress);

    let animT0: number | null = null;
    let animStart = 0;
    let animTarget = 0;
    function animateEyeStep(ts: number) {
      if (animT0 === null) animT0 = ts;
      const elapsed = ts - animT0;
      const p = Math.min(1, elapsed / EYE_MORPH_MS);
      eyeProgress = animStart + (animTarget - animStart) * p;
      paintEye(eyeProgress);
      if (p < 1) { eyeRaf = requestAnimationFrame(animateEyeStep); }
      else { eyeRaf = 0; eyeProgress = animTarget; paintEye(eyeProgress); }
    }
    function animateEyeTo(target: number) {
      if (eyeRaf) { cancelAnimationFrame(eyeRaf); eyeRaf = 0; }
      if (reduce) { eyeProgress = target; paintEye(eyeProgress); return; }
      animStart = eyeProgress;
      animTarget = target;
      animT0 = null;
      eyeRaf = requestAnimationFrame(animateEyeStep);
    }

    let revealed = false;
    function setRevealed(next: boolean) {
      revealed = next;
      input!.type = revealed ? "text" : "password";
      root!.classList.toggle(styles["is-revealed"], revealed);
      toggle!.setAttribute("aria-pressed", String(revealed));
      toggle!.setAttribute("aria-label", revealed ? LABEL_HIDE : LABEL_SHOW);
      animateEyeTo(revealed ? 1 : 0);
    }

    function onToggleClick() {
      root!.classList.remove(styles["is-demo"]);
      setRevealed(!revealed);
    }
    toggle.addEventListener("click", onToggleClick);

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
    if (!reduce) { startTimer = window.setTimeout(demoLoop, 200); }

    return () => {
      input.removeEventListener("input", onInput);
      toggle.removeEventListener("click", onToggleClick);
      form.removeEventListener("submit", onSubmit);
      if (eyeRaf) cancelAnimationFrame(eyeRaf);
      window.clearTimeout(startTimer);
      window.clearTimeout(loopTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.pem} ${styles["is-demo"]}`}>
        <form ref={formRef} className={styles.form} noValidate>
          <label className={styles.field}>
            <span className={styles.labelText}>비밀번호</span>
            <span className={styles.inputWrap}>
              <input
                ref={inputRef}
                className={styles.input}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                defaultValue=""
              />
              <span ref={overlayRef} className={styles.overlay} aria-hidden="true" />
              <button ref={toggleRef} className={styles.toggle} type="button" aria-pressed="false" aria-label="비밀번호 표시">
                <svg className={styles.eye} viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
                  <path ref={lidTopRef} d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path ref={lidBottomRef} d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <circle ref={pupilRef} cx={12} cy={12} r={3.2} fill="currentColor" />
                </svg>
              </button>
            </span>
          </label>
        </form>
      </div>
    </main>
  );
}
