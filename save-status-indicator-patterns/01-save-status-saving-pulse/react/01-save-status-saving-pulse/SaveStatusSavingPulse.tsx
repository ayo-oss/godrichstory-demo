import { useEffect, useRef } from "react";
import styles from "./SaveStatusSavingPulse.module.scss";

type Box<T> = { current: T };

export default function SaveStatusSavingPulse() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const dotEls = Array.from(root.querySelectorAll(`.${styles.d}`)) as HTMLElement[];
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!label || !btn || dotEls.length < 3) return;

    // 상수: 펄스 한 주기 · 점 세 개의 위상 차 · 저장 중 유지시간 · 저장됨 유지시간
    const PULSE_PERIOD_MS = 900;
    const DOT_STAGGER_MS = 160;
    const SAVING_MS = 2400;
    const IDLE_MS = 1000;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let phase: "saving" | "idle" = "saving";
    let phaseStart: number | null = null;
    let rafId = 0;

    // 계산 겹: 문구 밝기 값 = 경과시간을 주기로 나눈 위상의 sin 진폭, 점마다 위상을 어긋내 순차로 밝아진다
    function raf(ts: number) {
      if (phaseStart === null) phaseStart = ts;
      const el = ts - phaseStart;
      if (phase === "saving") {
        if (reduce) {
          label!.style.opacity = "1";
          dotEls.forEach((d) => { d.style.opacity = ".6"; });
        } else {
          const t = (el % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
          const op = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
          label!.style.opacity = op.toFixed(3);
          dotEls.forEach((d, i) => {
            const dop = 0.2 + 0.8 * Math.abs(Math.sin((el - i * DOT_STAGGER_MS) / PULSE_PERIOD_MS * Math.PI));
            d.style.opacity = dop.toFixed(3);
          });
        }
        if (el > SAVING_MS) {
          phase = "idle"; phaseStart = ts;
          label!.textContent = "저장됨";
          label!.style.opacity = "1";
          dotEls.forEach((d) => { d.style.opacity = "0"; });
          root!.classList.add(styles["ssp--done"]);
        }
      } else {
        if (el > IDLE_MS) {
          phase = "saving"; phaseStart = ts;
          label!.textContent = "저장 중";
          root!.classList.remove(styles["ssp--done"]);
        }
      }
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      phase = "saving"; phaseStart = null;
      label!.textContent = "저장 중";
      root!.classList.remove(styles["ssp--done"]);
    }
    btn.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ssp} ${styles["is-demo"]}`}>
      <div className={styles.card}>
        <span className={styles.dot} />
        <span className={styles.label}>저장 중</span>
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.d} />
          <span className={styles.d} />
          <span className={styles.d} />
        </span>
      </div>
      <button className={styles.btn} type="button">지금 저장</button>
    </div>
  );
}
