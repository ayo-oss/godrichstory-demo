import { useEffect, useRef } from "react";
import styles from "./PasswordRevealCapslockWarningSpring.module.scss";

type Box<T> = { current: T };

const CAPSLOCK_BADGE_OVERSHOOT_PX = 6;
const SPRING_STIFFNESS = 210;
const SPRING_DAMPING = 14;
const BADGE_RISE_PX = 14;
const LABEL_SHOW = "비밀번호 표시";
const LABEL_HIDE = "비밀번호 숨기기";
const ANNOUNCE_ON = "Caps Lock 켜짐";
const ANNOUNCE_OFF = "Caps Lock 꺼짐";

export default function PasswordRevealCapslockWarningSpring() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;
  const formRef = useRef(null) as unknown as Box<HTMLFormElement | null>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const toggleRef = useRef(null) as unknown as Box<HTMLButtonElement | null>;
  const badgeRef = useRef(null) as unknown as Box<HTMLSpanElement | null>;
  const announceRef = useRef(null) as unknown as Box<HTMLSpanElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    const form = formRef.current;
    const input = inputRef.current;
    const toggle = toggleRef.current;
    const badge = badgeRef.current;
    const announce = announceRef.current;
    if (!root || !form || !input || !toggle || !badge || !announce) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426022);
    const POOL_ALL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?-";
    function makeFakePassword() {
      const len = 8 + Math.floor(pwRand() * 5);
      let out = "";
      for (let i = 0; i < len; i += 1) out += POOL_ALL.charAt(Math.floor(pwRand() * POOL_ALL.length));
      return out;
    }
    input.value = makeFakePassword();

    let revealed = false;
    function setRevealed(next: boolean) {
      revealed = next;
      input!.type = revealed ? "text" : "password";
      toggle!.setAttribute("aria-pressed", String(revealed));
      toggle!.setAttribute("aria-label", revealed ? LABEL_HIDE : LABEL_SHOW);
      root!.classList.toggle(styles["is-revealed"], revealed);
    }
    function onToggleClick() {
      root!.classList.remove(styles["is-demo"]);
      setRevealed(!revealed);
    }
    toggle.addEventListener("click", onToggleClick);

    let pos = 0;
    let vel = 0;
    let target = 0;
    let springRaf = 0;
    let lastT: number | null = null;

    function paintBadge(p: number) {
      const clamped = Math.min(1, Math.max(0, p));
      const overshoot = Math.max(0, p - 1);
      const y = BADGE_RISE_PX * (1 - clamped) - CAPSLOCK_BADGE_OVERSHOOT_PX * overshoot;
      const scale = 0.86 + 0.14 * clamped + 0.05 * overshoot;
      const opacity = Math.min(1, clamped * 3);
      badge!.style.transform = "translateY(" + y.toFixed(2) + "px) scale(" + scale.toFixed(3) + ")";
      badge!.style.opacity = String(opacity);
    }
    paintBadge(pos);

    function stepSpring(ts: number) {
      if (lastT === null) lastT = ts;
      const dt = Math.min(0.032, (ts - lastT) / 1000);
      lastT = ts;
      const acc = (target - pos) * SPRING_STIFFNESS - vel * SPRING_DAMPING;
      vel += acc * dt;
      pos += vel * dt;
      paintBadge(pos);
      const settled = Math.abs(target - pos) < 0.002 && Math.abs(vel) < 0.01;
      if (!settled) {
        springRaf = requestAnimationFrame(stepSpring);
      } else {
        pos = target;
        paintBadge(pos);
        springRaf = 0;
        lastT = null;
      }
    }

    function setCapsLock(on: boolean) {
      const next = on ? 1 : 0;
      if (target === next) return;
      target = next;
      badge!.classList.toggle(styles["badge--active"], on);
      root!.classList.toggle(styles.warning, on);
      announce!.textContent = on ? ANNOUNCE_ON : ANNOUNCE_OFF;
      if (reduce) {
        if (springRaf) { cancelAnimationFrame(springRaf); springRaf = 0; }
        pos = target;
        vel = 0;
        lastT = null;
        paintBadge(pos);
        return;
      }
      if (!springRaf) { lastT = null; springRaf = requestAnimationFrame(stepSpring); }
    }

    function onKey(e: KeyboardEvent) {
      if (!e.getModifierState) return;
      setCapsLock(e.getModifierState("CapsLock"));
    }
    input.addEventListener("keydown", onKey);
    input.addEventListener("keyup", onKey);

    function onSubmit(e: Event) { e.preventDefault(); }
    form.addEventListener("submit", onSubmit);

    if (reduce) { root.classList.remove(styles["is-demo"]); }

    let loopTimer = 0;
    let offTimer = 0;
    function demoLoop() {
      if (reduce) return;
      setCapsLock(true);
      offTimer = window.setTimeout(function () { setCapsLock(false); }, 1100);
      loopTimer = window.setTimeout(demoLoop, 2200);
    }
    let startTimer = 0;
    if (!reduce) { startTimer = window.setTimeout(demoLoop, 240); }

    return () => {
      toggle.removeEventListener("click", onToggleClick);
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("keyup", onKey);
      form.removeEventListener("submit", onSubmit);
      if (springRaf) cancelAnimationFrame(springRaf);
      window.clearTimeout(startTimer);
      window.clearTimeout(loopTimer);
      window.clearTimeout(offTimer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.pcs} ${styles["is-demo"]}`}>
        <form ref={formRef} className={styles.form} noValidate>
          <label className={styles.field}>
            <span className={styles.labelRow}>
              <span className={styles.labelText}>비밀번호</span>
              <span ref={badgeRef} className={styles.badge} role="status">
                <svg className={styles.badgeIcon} width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
                  <g fill="currentColor">
                    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                    <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m-8-80V80a8 8 0 0 1 16 0v56a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
                  </g>
                </svg>
                <span className={styles.badgeText}>Caps Lock</span>
              </span>
              <span ref={announceRef} className={styles.srAnnounce} aria-live="polite" />
            </span>
            <span className={styles.inputWrap}>
              <input
                ref={inputRef}
                className={styles.input}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                defaultValue=""
              />
              <button ref={toggleRef} className={styles.toggle} type="button" aria-pressed="false" aria-label="비밀번호 표시">
                <svg className={styles.eyeShow} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
                  <path d="M2,12 C5,6 9,4 12,4 C15,4 19,6 22,12 C19,18 15,20 12,20 C9,20 5,18 2,12 Z" fill="none" stroke="currentColor" strokeWidth={2} />
                  <circle cx={12} cy={12} r={3.2} fill="currentColor" />
                </svg>
                <svg className={styles.eyeHide} viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
                  <path d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  <path d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </button>
            </span>
          </label>
        </form>
      </div>
    </main>
  );
}
