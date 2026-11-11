import { useEffect, useRef } from "react";
import styles from "./PasswordRevealAutofillHighlightGlow.module.scss";

export default function PasswordRevealAutofillHighlightGlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const btn = btnRef.current;
    if (!root || !input || !btn) return;

    const AUTOFILL_GLOW_PULSE_MS = 900;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const pwRand = seedRand(426051);
    const pool = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
    let seedValue = "";
    for (let i = 0; i < 11; i += 1) seedValue += pool[Math.floor(pwRand() * pool.length)];

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let glowRaf = 0;
    let glowStartTs: number | null = null;

    function glowTick(ts: number) {
      if (glowStartTs === null) glowStartTs = ts;
      const t = ts - glowStartTs;
      if (t > AUTOFILL_GLOW_PULSE_MS) {
        input!.style.setProperty("--glow", "0");
        root!.style.setProperty("--glow", "0");
        glowRaf = 0;
        glowStartTs = null;
        return;
      }
      const envelope = Math.max(0, Math.sin(Math.PI * t / AUTOFILL_GLOW_PULSE_MS)) * Math.exp(-2.2 * t / AUTOFILL_GLOW_PULSE_MS);
      input!.style.setProperty("--glow", String(envelope));
      root!.style.setProperty("--glow", String(envelope));
      glowRaf = requestAnimationFrame(glowTick);
    }

    function resetField() {
      input!.value = "";
    }

    function fillAndGlow() {
      input!.value = seedValue;
      if (reduce) {
        input!.style.setProperty("--glow", "0");
        return;
      }
      if (glowRaf) cancelAnimationFrame(glowRaf);
      glowStartTs = null;
      glowRaf = requestAnimationFrame(glowTick);
    }

    function onClick() { fillAndGlow(); }
    btn.addEventListener("click", onClick);

    if (reduce) root.classList.remove("is-demo");
    let loopTimer: ReturnType<typeof setTimeout> | null = null;
    let loopInterval: ReturnType<typeof setInterval> | null = null;
    if (root.classList.contains("is-demo")) {
      loopTimer = setTimeout(() => {
        fillAndGlow();
        loopInterval = setInterval(() => {
          resetField();
          fillAndGlow();
        }, 2000);
      }, 200);
    }

    return () => {
      btn.removeEventListener("click", onClick);
      if (glowRaf) cancelAnimationFrame(glowRaf);
      if (loopTimer) clearTimeout(loopTimer);
      if (loopInterval) clearInterval(loopInterval);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.afg} is-demo`} ref={rootRef}>
        <label className={styles.afg__label} htmlFor="afg-input-react">저장된 비밀번호</label>
        <div className={styles.afg__frame}>
          <input
            id="afg-input-react"
            ref={inputRef}
            className={styles.afg__input}
            type="password"
            placeholder="자동입력 대기 중"
          />
        </div>
        <button type="button" className={styles.afg__btn} ref={btnRef}>자동입력 흉내</button>
      </div>
    </main>
  );
}
