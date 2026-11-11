import { useEffect, useRef } from "react";
import styles from "./AuthAttemptHistoryListFade.module.scss";

type Box<T> = { current: T };
type Entry = { result: string; time: string };

export default function AuthAttemptHistoryListFade() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const list = root.querySelector(`.${styles.list}`) as HTMLElement | null;
    if (!btn || !list) return;

    // 상수: 화면에 보이는 최대 기록 수 · 기록 하나마다 낮아지는 투명도 폭 · 최소 투명도
    const MAX_ENTRIES = 5;
    const OPACITY_STEP = 0.18;
    const MIN_OPACITY = 0.16;

    const SEQ = ["실패", "실패", "성공", "실패", "실패", "실패", "성공", "실패"];
    let seqIdx = 0;
    let entries: Entry[] = [];

    function fmtTime(n: number) {
      const m = String(10 + (n % 50)).padStart(2, "0");
      return "10:" + m;
    }

    // 계산 겹: i번째(0=최신) 항목의 불투명도 = max(최소, 1 − i×STEP)
    function render() {
      list!.innerHTML = "";
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const op = Math.max(MIN_OPACITY, 1 - i * OPACITY_STEP);
        const li = document.createElement("li");
        li.className = styles.row + " " + (e.result === "실패" ? styles["row--fail"] : styles["row--ok"]);
        li.style.opacity = op.toFixed(2);
        li.innerHTML =
          '<span class="' + styles.time + '">' + e.time + "</span>" +
          '<span class="' + styles.result + '">' + e.result + "</span>";
        list!.appendChild(li);
      }
    }

    function addEntry() {
      const result = SEQ[seqIdx % SEQ.length];
      seqIdx += 1;
      entries.unshift({ result, time: fmtTime(seqIdx) });
      if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
      render();
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      addEntry();
    }
    btn.addEventListener("click", onClick);
    render();

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(addEntry, 340); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ahf} ${styles["is-demo"]}`}>
      <button className={styles.btn} type="button">로그인 시도 추가</button>
      <ul className={styles.list} />
    </div>
  );
}
