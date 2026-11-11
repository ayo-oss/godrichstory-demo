import { useEffect, useRef } from "react";
import styles from "./PasswordRevealKeyboardShortcutFocusRing.module.scss";

export default function PasswordRevealKeyboardShortcutFocusRing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eyeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const eyeBtn = eyeBtnRef.current;
    if (!root || !input || !eyeBtn) return;

    const FOCUS_RING_FLASH_MS = 500;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426082);
    const PW_POOL = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    function pickPassword(len: number) {
      let out = "";
      for (let i = 0; i < len; i += 1) out += PW_POOL[Math.floor(pwRand() * PW_POOL.length)];
      return out;
    }
    input.value = pickPassword(11);

    function toggleReveal() {
      const willShow = input!.type === "password";
      input!.type = willShow ? "text" : "password";
      eyeBtn!.setAttribute("aria-pressed", String(willShow));
      root!.classList.toggle("is-open", willShow);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flashStart = 0;
    let flashRaf = 0;
    let flashing = false;
    let reduceFlashTimer = 0;

    function step(ts: number) {
      const t = ts - flashStart;
      const envelope = Math.max(0, 1 - t / FOCUS_RING_FLASH_MS);
      input!.style.setProperty("--ring-alpha", String(envelope));
      if (envelope > 0) {
        flashRaf = requestAnimationFrame(step);
      } else {
        flashing = false;
      }
    }

    function flashFocusRing() {
      if (reduce) {
        input!.style.setProperty("--ring-alpha", "1");
        window.clearTimeout(reduceFlashTimer);
        reduceFlashTimer = window.setTimeout(function () {
          input!.style.setProperty("--ring-alpha", "0");
        }, FOCUS_RING_FLASH_MS);
        return;
      }
      flashStart = performance.now();
      if (flashing) return;
      flashing = true;
      flashRaf = requestAnimationFrame(step);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyH") {
        e.preventDefault();
        toggleReveal();
        flashFocusRing();
      }
    }
    function onEyeClick() {
      toggleReveal();
      flashFocusRing();
      input!.focus({ preventScroll: true });
    }

    input.addEventListener("keydown", onKeyDown);
    eyeBtn.addEventListener("click", onEyeClick);

    if (reduce) root.classList.remove("is-demo");

    let demoTimer = 0;
    function demoLoop() {
      if (!root!.classList.contains("is-demo")) return;
      toggleReveal();
      flashFocusRing();
      demoTimer = window.setTimeout(demoLoop, 2000);
    }
    if (!reduce) demoTimer = window.setTimeout(demoLoop, 200);

    return () => {
      input.removeEventListener("keydown", onKeyDown);
      eyeBtn.removeEventListener("click", onEyeClick);
      cancelAnimationFrame(flashRaf);
      window.clearTimeout(reduceFlashTimer);
      window.clearTimeout(demoTimer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pkf} is-demo`} ref={rootRef}>
        <label className={styles.pkf__label} htmlFor="pkfInputReact">비밀번호</label>
        <div className={styles.pkf__field}>
          <input className={styles.pkf__input} id="pkfInputReact" type="password" aria-describedby="pkfHintReact" ref={inputRef} readOnly />
          <button className={styles.pkf__eyeBtn} type="button" aria-pressed="false" aria-label="비밀번호 보기" ref={eyeBtnRef}>
            <svg className={styles.pkf__eye} viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
              <path className={styles.pkf__eyeOpen} d="M2,12 Q12,4 22,12 Q12,20 2,12Z" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
              <circle className={styles.pkf__eyeOpen} cx={12} cy={12} r={3.2} fill="currentColor" />
              <path className={styles.pkf__eyeShut} d="M2,12 Q12,18 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className={styles.pkf__hint} id="pkfHintReact">
          <span className={styles.pkf__hintText}>단축키로도 전환할 수 있다</span>
          <span className={styles.pkf__combo}>
            <kbd className={styles.pkf__kbd}>Ctrl</kbd>+<kbd className={styles.pkf__kbd}>Shift</kbd>+<kbd className={styles.pkf__kbd}>H</kbd>
          </span>
        </p>
      </div>
    </main>
  );
}
