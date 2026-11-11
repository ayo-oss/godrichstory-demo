import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import styles from "./DebounceSearch.module.scss";

// 디바운스 검색 — 입력 값이 바뀔 때마다 남은 대기 시간을 처음부터 다시 잰다(디바운스).
// 계산 겹: 진행 막대 폭은 실제 경과 시간 / WAIT_MS 비율로 매 프레임 다시 계산한다 — 고정 트랜지션이 아니다.
const WAIT_MS = 480;
const ITEMS = ["사과 파이 레시피", "사과나무 병충해", "사과주스 만들기", "바나나 스무디", "바나나빵 굽기"];
const SCRIPT = ["사", "사과", "사과 ", "사과 파"];

export default function DebounceSearch() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState("");
  const [matched, setMatched] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const autoplayRef = useRef<number | null>(null);

  function tick() {
    const elapsed = Date.now() - (startedAtRef.current ?? 0);
    const ratio = Math.min(1, elapsed / WAIT_MS);
    barRef.current?.style.setProperty("--r", ratio.toFixed(3));
    if (ratio < 1) { rafRef.current = requestAnimationFrame(tick); }
  }

  function search(v: string) {
    const q = v.trim().toLowerCase();
    const list = q ? ITEMS.filter((t) => t.toLowerCase().indexOf(q) !== -1) : [];
    setMatched(list);
    barRef.current?.style.setProperty("--r", "0");
  }

  function onInput(v: string) {
    setValue(v);
    startedAtRef.current = Date.now();
    barRef.current?.style.setProperty("--r", "0");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => search(v), WAIT_MS);
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let i = 0;
      autoplayRef.current = window.setInterval(() => {
        onInput(SCRIPT[i % SCRIPT.length]);
        i += 1;
      }, 640);
    }
    return () => {
      stopAutoplay();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.db} ${styles["is-demo"]}`}>
        <div className={styles.db__field}>
          <input
            className={styles.db__input}
            type="text"
            value={value}
            placeholder="검색어 입력"
            aria-label="검색"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              rootRef.current?.classList.remove(styles["is-demo"]);
              stopAutoplay();
              onInput(e.target.value);
            }}
          />
          <span ref={barRef} className={styles.db__bar} style={{ "--r": 0 } as CSSProperties} />
        </div>
        <ul className={styles.db__list}>
          {matched.map((text) => (
            <li key={text} className={styles.db__row}>{text}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
