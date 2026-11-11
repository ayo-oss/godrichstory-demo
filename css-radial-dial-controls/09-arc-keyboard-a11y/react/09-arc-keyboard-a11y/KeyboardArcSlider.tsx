// KeyboardArcSlider — vanilla 판(run/374/demo/09-arc-keyboard-a11y/index.html) 의 React 포트.
// 계산 겹: valueToDeg(값→각도)와 stepPct(화살표 키 한 걸음의 각도를 퍼센트로 환산). 실제 role="slider" +
// aria-valuenow 를 쓰고 화살표 키가 진짜로 값을 움직인다.
import { useEffect, useRef, useState } from "react";
import styles from "./KeyboardArcSlider.module.scss";

type Box<T> = { current: T };

const STEP_DEG = 12;
const RANGE_DEG = 300;
const LOOP_MS = 2000;

export default function KeyboardArcSlider() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [value, setValueState] = useState(40);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const handle = handleRef.current;
    if (!root || !handle) return;

    let isDemo = true;
    let value = 40;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function valueToDeg(v: number) {
      return -RANGE_DEG / 2 + (Math.min(100, Math.max(0, v)) / 100) * RANGE_DEG;
    }

    function apply() {
      handle!.style.setProperty("--deg", String(valueToDeg(value)));
      handle!.setAttribute("aria-valuenow", String(Math.round(value)));
      handle!.setAttribute("aria-valuetext", Math.round(value) + "%");
      setValueState(Math.round(value));
    }

    function setValue(v: number) { value = Math.min(100, Math.max(0, v)); apply(); }

    const stepPct = (STEP_DEG / RANGE_DEG) * 100;

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); human(); setValue(value + stepPct); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); human(); setValue(value - stepPct); }
      else if (e.key === "Home") { e.preventDefault(); human(); setValue(0); }
      else if (e.key === "End") { e.preventDefault(); human(); setValue(100); }
    }
    function onDown() { human(); handle!.focus({ preventScroll: true }); }
    handle.addEventListener("keydown", onKeydown);
    handle.addEventListener("pointerdown", onDown);

    let dir = 1;
    let acc = 0;
    function loop(ts: number) {
      if (isDemo && !reduce) {
        acc += 16.7;
        if (acc >= LOOP_MS / 12) {
          acc = 0;
          value += dir * stepPct;
          if (value >= 100) { value = 100; dir = -1; }
          if (value <= 0) { value = 0; dir = 1; }
          apply();
        }
      } else if (isDemo && reduce) {
        value = 40;
        apply();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      handle.removeEventListener("keydown", onKeydown);
      handle.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ka + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.ring}>
          <div
            className={styles.handle}
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-label="화살표 키로 조절하는 재생 볼륨"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={value + "%"}
          />
        </div>
        <p className={styles.hint}>← → 로 볼륨 조절</p>
      </div>
    </main>
  );
}
