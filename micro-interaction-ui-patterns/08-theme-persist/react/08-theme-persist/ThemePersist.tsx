import { useEffect, useRef, useState } from "react";
import styles from "./ThemePersist.module.scss";

// 테마 저장 토글 — 놉 이동 거리(--x)는 트랙·놉의 실측 사각형 차이에서 구한 값이다(BD19).
// 계산 겹: 값을 켤 때마다 localStorage 에 적어 다음 로드 때 같은 값을 복원한다.
const KEY = "demo-348-theme";

export default function ThemePersist() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const [dark, setDark] = useState(false);
  const darkRef = useRef(false);
  const autoplayRef = useRef<number | null>(null);

  function place(nextDark: boolean) {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;
    const trackRect = track.getBoundingClientRect();
    const knobRect = knob.getBoundingClientRect();
    const travel = trackRect.width - knobRect.width - 6;
    knob.style.setProperty("--x", (nextDark ? travel : 0).toFixed(1) + "px");
  }

  function apply(next: boolean, persist: boolean) {
    darkRef.current = next;
    setDark(next);
    place(next);
    if (persist) {
      try {
        window.localStorage.setItem(KEY, next ? "dark" : "light");
      } catch (err) { /* 무시 */ }
    }
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    let initial = false;
    try {
      initial = window.localStorage.getItem(KEY) === "dark";
    } catch (err) { initial = false; }
    apply(initial, false);

    const onResize = () => place(darkRef.current ?? false);
    window.addEventListener("resize", onResize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        apply(!(darkRef.current ?? false), true);
      }, 620);
    }
    return () => {
      stopAutoplay();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.tp} ${styles["is-demo"]}`}>
        <button
          ref={trackRef}
          className={styles.tp__track}
          type="button"
          aria-pressed={dark}
          onClick={() => {
            rootRef.current?.classList.remove(styles["is-demo"]);
            stopAutoplay();
            apply(!dark, true);
          }}
        >
          <span ref={knobRef} className={styles.tp__knob} />
          <span className={`${styles.tp__ic} ${styles["tp__ic--sun"]}`}></span>
          <span className={`${styles.tp__ic} ${styles["tp__ic--moon"]}`}></span>
        </button>
        <div className={styles.tp__card} data-theme={dark ? "dark" : "light"}>
          <p className={styles.tp__label}>저장된 테마</p>
          <p className={styles.tp__value}>{dark ? "어둡게" : "밝게"}</p>
        </div>
      </div>
    </main>
  );
}
