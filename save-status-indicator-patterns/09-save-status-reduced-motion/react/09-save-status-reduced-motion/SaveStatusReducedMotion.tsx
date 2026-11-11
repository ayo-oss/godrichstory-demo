import { useEffect, useRef } from "react";
import styles from "./SaveStatusReducedMotion.module.scss";

type Box<T> = { current: T };

export default function SaveStatusReducedMotion() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const badges = Array.from(root.querySelectorAll(`.${styles.badge}`)) as HTMLElement[];
    const labels = Array.from(root.querySelectorAll(`.${styles.label}`)) as HTMLElement[];
    const badgeA = badges[0];
    const badgeB = badges[1];
    const labelA = labels[0];
    const labelB = labels[1];
    if (!badgeA || !badgeB || !labelA || !labelB) return;

    // 상수: 저장 중 유지시간 · 저장됨 유지시간 · 일반 판 펄스 한 주기
    const SAVING_MS = 900;
    const IDLE_MS = 700;
    const PULSE_PERIOD_MS = 500;

    let phase: "saving" | "idle" = "saving";
    let phaseStart: number | null = null;
    let rafId = 0;
    let intervalId = 0;

    // 계산 겹: 일반 판은 경과시간 기반 sin 진폭으로 서서히 밝기가 바뀌고, 모션 감소 판은 같은 상태 값을 트윈 없이 즉시 반영한다
    function raf(ts: number) {
      if (phaseStart === null) phaseStart = ts;
      const el = ts - phaseStart;
      if (phase === "saving") {
        const t = (el % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
        badgeA.style.opacity = (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))).toFixed(3);
        if (el > SAVING_MS) {
          phase = "idle"; phaseStart = ts;
          labelA.textContent = labelB.textContent = "저장됨";
          badgeA.style.opacity = "1";
          badgeA.classList.add(styles["badge--done"]); badgeB.classList.add(styles["badge--done"]);
        }
      } else {
        if (el > IDLE_MS) {
          phase = "saving"; phaseStart = ts;
          labelA.textContent = labelB.textContent = "저장 중";
          badgeA.classList.remove(styles["badge--done"]); badgeB.classList.remove(styles["badge--done"]);
        }
      }
      rafId = requestAnimationFrame(raf);
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      phase = "saving"; phaseStart = null;
      labelA.textContent = labelB.textContent = "저장 중";
      badgeA.classList.remove(styles["badge--done"]); badgeB.classList.remove(styles["badge--done"]);
    }
    root.addEventListener("click", onClick);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      rafId = requestAnimationFrame(raf);
    } else {
      intervalId = window.setInterval(() => {
        phase = phase === "saving" ? "idle" : "saving";
        const text = phase === "saving" ? "저장 중" : "저장됨";
        labelA.textContent = labelB.textContent = text;
        badgeA.style.opacity = "1";
        badgeA.classList.toggle(styles["badge--done"], phase === "idle");
        badgeB.classList.toggle(styles["badge--done"], phase === "idle");
      }, SAVING_MS);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
      root!.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.srm} ${styles["is-demo"]}`}>
      <div className={styles.panel}>
        <span className={styles.tag}>일반 모션</span>
        <span className={styles.badge}>
          <span className={styles.dot} />
          <span className={styles.label}>저장 중</span>
        </span>
      </div>
      <div className={styles.panel}>
        <span className={styles.tag}>모션 감소</span>
        <span className={styles.badge}>
          <span className={styles.dot} />
          <span className={styles.label}>저장 중</span>
        </span>
      </div>
    </div>
  );
}
