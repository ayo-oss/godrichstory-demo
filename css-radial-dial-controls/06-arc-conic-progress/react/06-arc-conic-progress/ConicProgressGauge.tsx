// ConicProgressGauge — vanilla 판(run/374/demo/06-arc-conic-progress/index.html) 의 React 포트.
// 계산 겹: quantizedDeg — 퍼센트를 각도로 바꾼 뒤 GAUGE_STEP_DEG 배수로 끊어 내려 매끈한 보간 대신
// 계단형으로 채운다.
import { useEffect, useRef, useState } from "react";
import styles from "./ConicProgressGauge.module.scss";

type Box<T> = { current: T };

const GAUGE_STEP_DEG = 6;
const STEP_PCT = 10;
const LOOP_MS = 2000;

export default function ConicProgressGauge() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const ring = ringRef.current;
    if (!root || !ring) return;

    let isDemo = true;
    let value = 0;
    let shown = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function quantizedDeg(v: number) {
      const raw = Math.min(100, Math.max(0, v)) * 3.6;
      return Math.floor(raw / GAUGE_STEP_DEG) * GAUGE_STEP_DEG;
    }

    function apply() {
      ring!.style.setProperty("--deg", String(quantizedDeg(shown)));
      setPct(Math.round(shown));
    }

    function setValue(v: number) { value = Math.min(100, Math.max(0, v)); }

    function onMinus() { human(); setValue(value - STEP_PCT); }
    function onPlus() { human(); setValue(value + STEP_PCT); }

    const minusBtn = root!.querySelector<HTMLButtonElement>("[data-minus]");
    const plusBtn = root!.querySelector<HTMLButtonElement>("[data-plus]");
    minusBtn?.addEventListener("click", onMinus);
    plusBtn?.addEventListener("click", onPlus);

    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          value = phase < 0.82 ? Math.min(100, (phase / 0.82) * 100) : 100;
        } else {
          value = 62;
        }
      }
      shown += (value - shown) * (reduce ? 1 : 0.16);
      if (Math.abs(value - shown) < 0.05) shown = value;
      apply();
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      minusBtn?.removeEventListener("click", onMinus);
      plusBtn?.removeEventListener("click", onPlus);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cp + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ring} ref={ringRef} role="img" aria-label="업로드 진행 원형 게이지">
          <div className={styles.center}>
            <p className={styles.pct}>{pct}%</p>
            <p className={styles.label}>업로드 중</p>
          </div>
        </div>
        <div className={styles.btns}>
          <button className={styles.btn} data-minus type="button" aria-label="10% 줄이기">−</button>
          <button className={styles.btn} data-plus type="button" aria-label="10% 늘리기">+</button>
        </div>
      </div>
    </main>
  );
}
