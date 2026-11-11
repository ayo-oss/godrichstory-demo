import { useEffect, useRef, useState } from "react";
import styles from "./KeyboardShortcuts.module.scss";

// 키보드 단축키 — 눌린 키에서 조합 값을 다시 구해(수정 키 + 글자 키) 등록된 목록과 매칭한다.
// 계산 겹: 각 단축키를 따로 처리하지 않고 하나의 값 비교 함수가 셋 다 판정한다. 실사용 keydown 리스너 있음.
const ACTIONS: { [k: string]: string } = { "ctrl+s": "저장 실행됨", "ctrl+f": "찾기 실행됨", "ctrl+d": "복제 실행됨" };
const HINTS = [
  { combo: "ctrl+s", key: "S", label: "저장" },
  { combo: "ctrl+f", key: "F", label: "찾기" },
  { combo: "ctrl+d", key: "D", label: "복제" },
];
const ORDER = ["ctrl+s", "ctrl+f", "ctrl+d"];

export default function KeyboardShortcuts() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hit, setHit] = useState<string | null>(null);
  const [result, setResult] = useState("대기 중");
  const resetTimerRef = useRef<number | null>(null);
  const autoplayRef = useRef<number | null>(null);

  function combo(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey ? "ctrl+" : "";
    return mod + String(e.key).toLowerCase();
  }

  function trigger(key: string) {
    if (!ACTIONS[key]) return;
    setHit(key);
    setResult(ACTIONS[key]);
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setHit(null);
      setResult("대기 중");
    }, 900);
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
        trigger(ORDER[i % ORDER.length]);
        i += 1;
      }, 620);
    }
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    const key = combo(e);
    if (!ACTIONS[key]) return;
    e.preventDefault();
    rootRef.current?.classList.remove(styles["is-demo"]);
    stopAutoplay();
    trigger(key);
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.ks} ${styles["is-demo"]}`} tabIndex={0} onKeyDown={onKeyDown}>
        <p className={styles.ks__cap}>Ctrl 키와 함께 눌러보세요</p>
        <ul className={styles.ks__hints}>
          {HINTS.map((h) => (
            <li key={h.combo} className={`${styles.ks__hint} ${hit === h.combo ? styles["ks__hint--hit"] : ""}`}>
              <kbd>Ctrl</kbd><kbd>{h.key}</kbd><span>{h.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.ks__result} aria-live="polite">{result}</p>
      </div>
    </main>
  );
}
