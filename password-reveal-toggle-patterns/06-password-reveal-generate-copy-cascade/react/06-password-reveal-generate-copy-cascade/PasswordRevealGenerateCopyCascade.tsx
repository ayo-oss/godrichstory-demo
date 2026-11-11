import { useEffect, useRef } from "react";
import styles from "./PasswordRevealGenerateCopyCascade.module.scss";

export default function PasswordRevealGenerateCopyCascade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const display = displayRef.current;
    const btn = btnRef.current;
    if (!root || !display || !btn) return;

    const GENERATE_CASCADE_STEP_MS = 60;
    const COPY_MORPH_MS = 220;

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    const candRand = seedRand(426061);
    const pool = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    const CANDIDATES: string[] = [];
    for (let c = 0; c < 4; c += 1) {
      const len = 8 + Math.floor(candRand() * 3);
      let s = "";
      for (let j = 0; j < len; j += 1) s += pool[Math.floor(candRand() * pool.length)];
      CANDIDATES.push(s);
    }

    let candIndex = -1;
    const cascade = { target: "", revealed: 0, acc: 0, active: false, morphing: false, morphAcc: 0 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function generatePassword() {
      candIndex = (candIndex + 1) % CANDIDATES.length;
      const target = CANDIDATES[candIndex];
      cascade.target = target;
      cascade.acc = 0;
      cascade.morphAcc = 0;
      root!.style.setProperty("--copyMorph", "0");
      root!.classList.remove(styles.isCopied);
      if (reduce) {
        cascade.revealed = target.length;
        cascade.active = false;
        cascade.morphing = false;
        display!.textContent = target;
        root!.style.setProperty("--copyMorph", "1");
        root!.classList.add(styles.isCopied);
        return;
      }
      cascade.revealed = 0;
      cascade.active = true;
      cascade.morphing = false;
      display!.textContent = "";
    }

    function stepCascade(dtMs: number) {
      if (cascade.active) {
        cascade.acc += dtMs;
        while (cascade.acc >= GENERATE_CASCADE_STEP_MS && cascade.revealed < cascade.target.length) {
          cascade.acc -= GENERATE_CASCADE_STEP_MS;
          cascade.revealed += 1;
          display!.textContent = cascade.target.slice(0, cascade.revealed);
        }
        if (cascade.revealed >= cascade.target.length) {
          cascade.active = false;
          cascade.morphing = true;
          cascade.morphAcc = 0;
        }
      } else if (cascade.morphing) {
        cascade.morphAcc += dtMs;
        const p = Math.min(1, cascade.morphAcc / COPY_MORPH_MS);
        root!.style.setProperty("--copyMorph", String(p));
        if (p >= 1) {
          cascade.morphing = false;
          root!.classList.add(styles.isCopied);
        }
      }
    }

    function onClick() { generatePassword(); }
    btn.addEventListener("click", onClick);

    let lastTs: number | null = null;
    let raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!reduce) stepCascade(dt);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    if (reduce) root.classList.remove("is-demo");
    let loopTimer: ReturnType<typeof setTimeout> | null = null;
    let loopInterval: ReturnType<typeof setInterval> | null = null;
    if (root.classList.contains("is-demo")) {
      loopTimer = setTimeout(() => {
        generatePassword();
        loopInterval = setInterval(generatePassword, 2000);
      }, 200);
    }

    return () => {
      btn.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      if (loopTimer) clearTimeout(loopTimer);
      if (loopInterval) clearInterval(loopInterval);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.gcc} is-demo`} ref={rootRef}>
        <label className={styles.gcc__label} htmlFor="gcc-display-react">생성된 비밀번호</label>
        <div className={styles.gcc__frame}>
          <div id="gcc-display-react" className={styles.gcc__display} ref={displayRef} aria-live="polite" />
          <span className={styles.gcc__status} aria-hidden="true">
            <svg className={`${styles.gcc__icon} ${styles["gcc__icon--copy"]}`} viewBox="0 0 256 256" width="22" height="22">
              <g fill="currentColor">
                <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
                <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
              </g>
            </svg>
            <span className={styles.gcc__check}>
              <span className={`${styles.gcc__checkBar} ${styles["gcc__checkBar--short"]}`} />
              <span className={`${styles.gcc__checkBar} ${styles["gcc__checkBar--long"]}`} />
            </span>
          </span>
        </div>
        <button type="button" className={styles.gcc__gen} ref={btnRef}>생성</button>
      </div>
    </main>
  );
}
