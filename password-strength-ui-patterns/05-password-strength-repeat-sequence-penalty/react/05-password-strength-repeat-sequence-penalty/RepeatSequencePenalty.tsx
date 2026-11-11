import { useEffect, useRef } from "react";
import styles from "./RepeatSequencePenalty.module.scss";

type Box<T> = { current: T };

const PER_CHAR_PENALTY = 8;

export default function RepeatSequencePenalty() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const input = root.querySelector(`.${styles.input}`) as HTMLInputElement | null;
    const chipsBox = root.querySelector(`.${styles.chips}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const scoreEl = root.querySelector(`.${styles.scoreNum}`) as HTMLElement | null;
    const warn = root.querySelector(`.${styles.warn}`) as HTMLElement | null;
    const penaltyEl = root.querySelector(`.${styles.penaltyNum}`) as HTMLElement | null;
    if (!input || !chipsBox || !fill || !scoreEl || !warn || !penaltyEl) return;

    // 계산 겹: 같은 글자 3연속(반복) 또는 문자코드 증감 1씩 3연속(연속)을 찾아
    // 그 위치들을 표시하고, 표시된 글자 수 × 감점값을 기본 점수에서 뺀다.
    function flagPositions(value: string) {
      const n = value.length;
      const flag = new Array(n).fill(false);
      let i = 0;
      while (i < n) {
        let j = i;
        while (j + 1 < n && value.charCodeAt(j + 1) === value.charCodeAt(j)) j++;
        if (j - i + 1 >= 3) for (let k = i; k <= j; k++) flag[k] = true;
        i = j + 1;
      }
      i = 0;
      while (i < n - 1) {
        const dir = value.charCodeAt(i + 1) - value.charCodeAt(i);
        if (dir === 1 || dir === -1) {
          let j2 = i + 1;
          while (j2 + 1 < n && value.charCodeAt(j2 + 1) - value.charCodeAt(j2) === dir) j2++;
          if (j2 - i + 1 >= 3) for (let k2 = i; k2 <= j2; k2++) flag[k2] = true;
          i = j2;
        } else {
          i++;
        }
      }
      return flag as boolean[];
    }

    function scoreOf(value: string) {
      const base = Math.min(100, value.length * 8);
      const flag = flagPositions(value);
      const hitCount = flag.filter(Boolean).length;
      const penalty = hitCount * PER_CHAR_PENALTY;
      const score = Math.max(0, base - penalty);
      return { score, flag, penalty };
    }

    function paint(value: string) {
      const r = scoreOf(value);
      fill!.style.transform = "scaleX(" + r.score / 100 + ")";
      root!.classList.toggle(styles["rs--hit"], r.penalty > 0);
      scoreEl!.textContent = String(r.score);
      penaltyEl!.textContent = "-" + r.penalty;
      warn!.style.opacity = r.penalty > 0 ? "1" : "0";
      warn!.style.transform = r.penalty > 0 ? "scale(1)" : "scale(.7)";

      chipsBox!.innerHTML = "";
      for (let i = 0; i < value.length; i++) {
        const chip = document.createElement("span");
        chip.className = styles.chip + (r.flag[i] ? " " + styles["chip--on"] : "");
        chipsBox!.appendChild(chip);
      }
    }

    function onInput() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      paint(input!.value);
    }
    input.addEventListener("input", onInput);
    paint(input.value);

    // 자동 루프: 시드 고정 문자열 배열 — 반복·연속 구간이 있는 값과 없는 값을 번갈아 입력한다.
    const SEQ = ["", "q7Kd", "aaaKd9", "12345Kd", "abcdKf3", "q7mR2z", "aaa123", ""];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { input!.value = SEQ[si]; paint(SEQ[si]); si = (si + 1) % SEQ.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); autoTick(); }

    return () => {
      stopAutoplay();
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.rs} ${styles["is-demo"]}`}>
      <label className={styles.field}>
        <input className={styles.input} type="text" autoComplete="off" spellCheck={false} defaultValue="" />
      </label>
      <div className={styles.chips} />
      <div className={styles.track}><div className={styles.fill} /></div>
      <div className={styles.row}>
        <span className={styles.score}>값 <b className={styles.scoreNum}>0</b>/100</span>
        <span className={styles.warn}>반복·연속 <b className={styles.penaltyNum}>-0</b></span>
      </div>
    </div>
  );
}
