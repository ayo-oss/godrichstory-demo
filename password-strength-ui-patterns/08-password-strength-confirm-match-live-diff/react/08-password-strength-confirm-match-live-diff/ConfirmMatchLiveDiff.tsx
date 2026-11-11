import { useEffect, useRef } from "react";
import styles from "./ConfirmMatchLiveDiff.module.scss";

type Box<T> = { current: T };

export default function ConfirmMatchLiveDiff() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pw = root.querySelector(`.${styles.pwInput}`) as HTMLInputElement | null;
    const confirm = root.querySelector(`.${styles.confirmInput}`) as HTMLInputElement | null;
    const chipsBox = root.querySelector(`.${styles.chips}`) as HTMLElement | null;
    const statusEl = root.querySelector(`.${styles.status}`) as HTMLElement | null;
    if (!pw || !confirm || !chipsBox || !statusEl) return;

    // 계산 겹: 두 값의 앞에서부터 같은 글자가 이어지는 개수(일치 길이)를 구하고,
    // 확인 입력이 그 길이를 넘어서면 그 지점이 곧 처음 어긋난 위치다.
    function matchLenOf(a: string, b: string) {
      const n = Math.min(a.length, b.length);
      let i = 0;
      while (i < n && a[i] === b[i]) i++;
      return i;
    }

    function paint() {
      const a = pw!.value, b = confirm!.value;
      const matchLen = matchLenOf(a, b);
      const full = b.length > 0 && a.length === b.length && matchLen === a.length;

      chipsBox!.innerHTML = "";
      for (let i = 0; i < b.length; i++) {
        const chip = document.createElement("span");
        chip.className = styles.chip + " " + (i < matchLen ? styles["chip--ok"] : styles["chip--bad"]);
        chipsBox!.appendChild(chip);
      }

      if (b.length === 0) statusEl!.textContent = "입력 대기";
      else if (full) statusEl!.textContent = b.length + "자 전체 일치";
      else if (matchLen === b.length) statusEl!.textContent = matchLen + "자까지 일치 · 계속 입력";
      else statusEl!.textContent = matchLen + "자까지 일치 · " + (matchLen + 1) + "번째에서 어긋남";

      root!.classList.toggle(styles["md--full"], full);
    }

    function onInput() { root!.classList.remove(styles["is-demo"]); stopAutoplay(); paint(); }
    pw.addEventListener("input", onInput);
    confirm.addEventListener("input", onInput);
    paint();

    // 자동 루프: 비밀번호는 고정, 확인 입력만 시드 고정 배열로 오타→정정 과정을 보여준다.
    const FIXED_PW = "abcd1234";
    const SEQ = ["", "a", "ab", "abc", "abcx", "abcd", "abcd1", "abcd12", "abcd123", "abcd1234", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      pw!.value = FIXED_PW;
      confirm!.value = SEQ[si];
      paint();
      si = (si + 1) % SEQ.length;
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); autoTick(); }

    return () => {
      stopAutoplay();
      pw.removeEventListener("input", onInput);
      confirm.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.md} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={`${styles.input} ${styles.pwInput}`} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <label className={styles.field}>
        <input className={`${styles.input} ${styles.confirmInput}`} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.chips} />
      <div className={styles.row}>
        <span className={styles.status}>입력 대기</span>
        <span className={styles.ok}>
          <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
            <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          일치
        </span>
      </div>
    </div>
  );
}
