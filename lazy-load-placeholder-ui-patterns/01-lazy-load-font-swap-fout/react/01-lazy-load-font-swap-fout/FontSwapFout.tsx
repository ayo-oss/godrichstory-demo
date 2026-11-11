import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./FontSwapFout.module.scss";

// 대체 서체 → 실제 서체 지연 로딩. 글자 인덱스 값으로 transition-delay 를 계산해
// 순서대로 스프링 오버슛이 번지게 한다.
const TEXT = "지연 로딩 헤드라인";
const STAGGER_STEP_MS = 45;
const FOUT_DELAY_MS = 700;
const HOLD_MS = 1800;
const RESET_DELAY_MS = 900;

export default function FontSwapFout() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [badge, setBadge] = useState("대체 서체 표시 중");
  const timerRef = useRef<number | null>(null);

  const playOnce = useCallback((loop: boolean) => {
    setLoaded(false);
    setBadge("대체 서체 표시 중");
    timerRef.current = window.setTimeout(() => {
      setLoaded(true);
      setBadge("실제 서체 로드 완료");
      if (loop) {
        timerRef.current = window.setTimeout(() => { playOnce(true); }, HOLD_MS + RESET_DELAY_MS);
      }
    }, FOUT_DELAY_MS);
  }, []);

  const replay = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); }
    setDemo(false);
    playOnce(false);
  }, [playOnce]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDemo(false);
      setLoaded(true);
      setBadge("실제 서체 로드 완료");
    } else {
      playOnce(true);
    }
    const root = rootRef.current;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); replay(); }
    }
    root?.addEventListener("keydown", onKeyDown);
    return () => {
      if (timerRef.current !== null) { window.clearTimeout(timerRef.current); }
      root?.removeEventListener("keydown", onKeyDown);
    };
  }, [playOnce, replay]);

  const chars = TEXT.split("").map((ch, i) => (
    <span
      key={i}
      className={`${styles["lff__char"]} ${loaded ? styles["lff__char--loaded"] : ""}`}
      style={{ transitionDelay: `${i * STAGGER_STEP_MS}ms` }}
    >
      {ch === " " ? " " : ch}
    </span>
  ));

  return (
    <main className={styles.stage}>
      <div
        ref={rootRef}
        className={`${styles.lff} ${demo ? styles["is-demo"] : ""} ${loaded ? styles["lff--loaded"] : ""}`}
        tabIndex={0}
        onClick={replay}
      >
        <div className={styles["lff__badge"]}>{badge}</div>
        <h2 className={styles["lff__head"]} aria-label="지연 로딩 헤드라인">{chars}</h2>
        <p className={styles["lff__hint"]}>클릭하면 다시 재생</p>
      </div>
    </main>
  );
}
