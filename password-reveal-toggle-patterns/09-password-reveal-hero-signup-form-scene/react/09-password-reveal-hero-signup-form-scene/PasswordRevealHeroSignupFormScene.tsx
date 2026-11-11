import { useEffect, useRef } from "react";
import styles from "./PasswordRevealHeroSignupFormScene.module.scss";

export default function PasswordRevealHeroSignupFormScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const pwFieldRef = useRef<HTMLDivElement>(null);
  const pwInputRef = useRef<HTMLInputElement>(null);
  const eyeBtnRef = useRef<HTMLButtonElement>(null);
  const lidTopRef = useRef<SVGPathElement>(null);
  const lidBottomRef = useRef<SVGPathElement>(null);
  const pupilRef = useRef<SVGCircleElement>(null);
  const autofillBtnRef = useRef<HTMLButtonElement>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const form = formRef.current;
    const emailField = emailFieldRef.current;
    const pwField = pwFieldRef.current;
    const pwInput = pwInputRef.current;
    const eyeBtn = eyeBtnRef.current;
    const lidTop = lidTopRef.current;
    const lidBottom = lidBottomRef.current;
    const pupil = pupilRef.current;
    const autofillBtn = autofillBtnRef.current;
    const generateBtn = generateBtnRef.current;
    if (!root || !form || !emailField || !pwField || !pwInput || !eyeBtn || !lidTop || !lidBottom || !pupil || !autofillBtn || !generateBtn) return;

    const HERO_EYE_MORPH_MS = 260;
    const HERO_GLOW_PULSE_MS = 900;
    const HERO_CASCADE_STEP_MS = 70;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426093);
    const cascadeRand = seedRand(426094);
    const PW_POOL = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    function pickPassword(len: number, rand: () => number) {
      let out = "";
      for (let i = 0; i < len; i += 1) out += PW_POOL[Math.floor(rand() * PW_POOL.length)];
      return out;
    }
    pwInput.value = pickPassword(9, pwRand);

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function heroMorphEye(progress: number) {
      const eased = easeOutCubic(progress);
      const lift = 8 * eased;
      lidTop!.setAttribute("d", "M2,12 Q12," + (12 - lift) + " 22,12");
      lidBottom!.setAttribute("d", "M2,12 Q12," + (12 + lift) + " 22,12");
      pupil!.style.opacity = String(eased);
    }
    heroMorphEye(0);

    let eyeProgress = 0, eyeFrom = 0, eyeTarget = 0, eyeStart = 0, eyeRafId = 0;
    function eyeStep(ts: number) {
      const t = Math.min(1, (ts - eyeStart) / HERO_EYE_MORPH_MS);
      eyeProgress = eyeFrom + (eyeTarget - eyeFrom) * easeOutCubic(t);
      heroMorphEye(eyeProgress);
      if (t < 1) { eyeRafId = requestAnimationFrame(eyeStep); }
    }
    function animateEyeTo(target: number) {
      eyeFrom = eyeProgress;
      eyeTarget = target;
      eyeStart = performance.now();
      cancelAnimationFrame(eyeRafId);
      eyeRafId = requestAnimationFrame(eyeStep);
    }

    function toggleEye() {
      const willShow = pwInput!.type === "password";
      pwInput!.type = willShow ? "text" : "password";
      eyeBtn!.setAttribute("aria-pressed", String(willShow));
      animateEyeTo(willShow ? 1 : 0);
    }

    let glowStart = 0, glowRafId = 0, glowing = false;
    function setGlow(v: number) {
      emailField!.style.setProperty("--glow", String(v));
      pwField!.style.setProperty("--glow", String(v));
    }
    function glowStep(ts: number) {
      const frac = (ts - glowStart) / HERO_GLOW_PULSE_MS;
      if (frac >= 1) { setGlow(0); glowing = false; return; }
      const envelope = Math.max(0, Math.sin(frac * Math.PI) * Math.exp(-frac * 2.2));
      setGlow(envelope);
      glowRafId = requestAnimationFrame(glowStep);
    }
    function heroSimulateAutofill() {
      glowStart = performance.now();
      if (glowing) return;
      glowing = true;
      glowRafId = requestAnimationFrame(glowStep);
    }

    let cascadeTimer = 0;
    function heroRunCascade() {
      const target = pickPassword(9, cascadeRand);
      let i = 0;
      pwInput!.type = "text";
      eyeBtn!.setAttribute("aria-pressed", "true");
      animateEyeTo(1);
      pwInput!.value = "";
      root!.classList.remove("is-generated");
      window.clearTimeout(cascadeTimer);
      function step() {
        i += 1;
        pwInput!.value = target.slice(0, i);
        if (i < target.length) {
          cascadeTimer = window.setTimeout(step, HERO_CASCADE_STEP_MS);
        } else {
          root!.classList.add("is-generated");
          cascadeTimer = window.setTimeout(function () {
            root!.classList.remove("is-generated");
          }, 500);
        }
      }
      step();
    }

    function onEyeClick() { toggleEye(); }
    function onAutofillClick() { heroSimulateAutofill(); }
    function onGenerateClick() { heroRunCascade(); }
    function onSubmit(e: Event) { e.preventDefault(); }

    eyeBtn.addEventListener("click", onEyeClick);
    autofillBtn.addEventListener("click", onAutofillClick);
    generateBtn.addEventListener("click", onGenerateClick);
    form.addEventListener("submit", onSubmit);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let demoTimers: number[] = [];
    function clearDemoTimers() {
      for (let i = 0; i < demoTimers.length; i += 1) window.clearTimeout(demoTimers[i]);
      demoTimers = [];
    }
    function demoLoop() {
      if (!root!.classList.contains("is-demo")) return;
      clearDemoTimers();
      demoTimers.push(window.setTimeout(function () { toggleEye(); }, 150));
      demoTimers.push(window.setTimeout(function () { toggleEye(); }, 650));
      demoTimers.push(window.setTimeout(function () { heroSimulateAutofill(); }, 900));
      demoTimers.push(window.setTimeout(function () { heroRunCascade(); }, 1500));
      demoTimers.push(window.setTimeout(function () {
        pwInput!.type = "password";
        eyeBtn!.setAttribute("aria-pressed", "false");
        animateEyeTo(0);
      }, 2600));
      demoTimers.push(window.setTimeout(demoLoop, 2800));
    }
    if (!reduce) demoTimers.push(window.setTimeout(demoLoop, 200));

    return () => {
      eyeBtn.removeEventListener("click", onEyeClick);
      autofillBtn.removeEventListener("click", onAutofillClick);
      generateBtn.removeEventListener("click", onGenerateClick);
      form.removeEventListener("submit", onSubmit);
      cancelAnimationFrame(eyeRafId);
      cancelAnimationFrame(glowRafId);
      window.clearTimeout(cascadeTimer);
      clearDemoTimers();
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.phs} is-demo`} ref={rootRef}>
        <form className={styles.phs__card} ref={formRef}>
          <p className={styles.phs__title}>회원가입</p>
          <div className={styles.phs__row}>
            <label className={styles.phs__label} htmlFor="phsEmailReact">이메일</label>
            <div className={styles.phs__staticField} id="phsEmailReact" ref={emailFieldRef}>you@example.com</div>
          </div>
          <div className={styles.phs__row}>
            <label className={styles.phs__label} htmlFor="phsPwReact">비밀번호</label>
            <div className={styles.phs__field} ref={pwFieldRef}>
              <input className={styles.phs__input} id="phsPwReact" type="password" aria-describedby="phsHintReact" ref={pwInputRef} readOnly />
              <button className={styles.phs__eyeBtn} type="button" aria-pressed="false" aria-label="비밀번호 보기" ref={eyeBtnRef}>
                <svg className={styles.phs__eye} viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                  <path className={styles.phs__lidTop} ref={lidTopRef} d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path className={styles.phs__lidBottom} ref={lidBottomRef} d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <circle className={styles.phs__pupil} ref={pupilRef} cx={12} cy={12} r={3.2} fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.phs__actions}>
            <button className={styles.phs__autofillBtn} type="button" ref={autofillBtnRef}>자동입력 흉내</button>
            <button className={styles.phs__generateBtn} type="button" ref={generateBtnRef}>
              <span>생성</span>
              <span className={styles.phs__icoWrap} aria-hidden="true">
                <svg className={styles.phs__copyIcon} width="1em" height="1em" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
                    <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
                  </g>
                </svg>
                <span className={styles.phs__checkIcon}>
                  <span className={`${styles.phs__checkBar} ${styles["phs__checkBar--short"]}`} />
                  <span className={`${styles.phs__checkBar} ${styles["phs__checkBar--long"]}`} />
                </span>
              </span>
            </button>
          </div>
          <p className={styles.phs__hint} id="phsHintReact">자동입력 흉내와 생성 버튼은 실제 클릭이 부르는 함수를 그대로 다시 부른다</p>
        </form>
      </div>
    </main>
  );
}
