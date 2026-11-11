import { useEffect, useRef } from "react";
import styles from "./PasswordRevealPasteDetectBanner.module.scss";

export default function PasswordRevealPasteDetectBanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const banner = bannerRef.current;
    if (!root || !input || !banner) return;

    const PASTE_BANNER_SLIDE_MS = 320;
    const PASTE_BANNER_VISIBLE_MS = 1400;
    const BANNER_MESSAGE = "비밀번호 관리자에서 붙여넣은 값을 확인하세요";

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    root.style.setProperty("--pdbSlideMs", PASTE_BANNER_SLIDE_MS + "ms");

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    function handlePaste() {
      if (hideTimer) clearTimeout(hideTimer);
      if (clearTimer) clearTimeout(clearTimer);
      banner!.textContent = BANNER_MESSAGE;
      banner!.classList.add(styles.isVisible);
      hideTimer = setTimeout(() => {
        banner!.classList.remove(styles.isVisible);
        clearTimer = setTimeout(() => { banner!.textContent = ""; }, PASTE_BANNER_SLIDE_MS);
      }, PASTE_BANNER_VISIBLE_MS);
    }

    function onPaste() { handlePaste(); }
    input.addEventListener("paste", onPaste);

    const pasteRand = seedRand(426041);
    const pool = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let fakeValue = "";
    for (let i = 0; i < 10; i += 1) fakeValue += pool[Math.floor(pasteRand() * pool.length)];

    function simulatePaste() {
      input!.value = fakeValue;
      handlePaste();
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");
    let loopTimer: ReturnType<typeof setTimeout> | null = null;
    let loopInterval: ReturnType<typeof setInterval> | null = null;
    if (root.classList.contains("is-demo")) {
      loopTimer = setTimeout(() => {
        simulatePaste();
        loopInterval = setInterval(simulatePaste, 2000);
      }, 200);
    }

    return () => {
      input.removeEventListener("paste", onPaste);
      if (hideTimer) clearTimeout(hideTimer);
      if (clearTimer) clearTimeout(clearTimer);
      if (loopTimer) clearTimeout(loopTimer);
      if (loopInterval) clearInterval(loopInterval);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pdb} is-demo`} ref={rootRef}>
        <label className={styles.pdb__label} htmlFor="pdb-input-react">비밀번호</label>
        <div className={styles.pdb__frame}>
          <input
            id="pdb-input-react"
            ref={inputRef}
            className={styles.pdb__input}
            type="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
          />
        </div>
        <p className={styles.pdb__banner} ref={bannerRef} aria-live="polite" />
      </div>
    </main>
  );
}
