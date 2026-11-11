import { useEffect, useRef } from "react";
import styles from "./NumberStepperPressHoldRepeat.module.scss";

export type NumberStepperPressHoldRepeatProps = {
  color?: string;
};

export default function NumberStepperPressHoldRepeat({
  color = "#0a4fe8",
}: NumberStepperPressHoldRepeatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const minusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnMinus}`);
    const plusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnPlus}`);
    const ringMinus = root.querySelector<SVGCircleElement>(`.${styles.ringMinus}`);
    const ringPlus = root.querySelector<SVGCircleElement>(`.${styles.ringPlus}`);
    if (!valueEl || !minusBtn || !plusBtn || !ringMinus || !ringPlus) return;

    const CIRC = 2 * Math.PI * 14;
    [ringMinus, ringPlus].forEach((r) => { r.style.strokeDasharray = CIRC.toFixed(2); });

    const MIN = 0, MAX = 30, DELAY = 380, INTERVAL = 220;
    let value = 12;
    let held: "plus" | "minus" | null = null;
    let lastTick = 0;
    let repeatTimer: ReturnType<typeof setInterval> | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let ringRaf: number | null = null;

    function render() { valueEl!.textContent = String(value); }

    function step(dir: number) {
      value = Math.max(MIN, Math.min(MAX, value + dir));
      render();
      lastTick = performance.now();
    }

    // 계산 겹: 반복 간격(220ms)은 고정이지만 다음 반복까지 남은 시간을 매 프레임 계산해
    // 링(stroke-dashoffset)에 대입한다 — 정적 트윈이 아니라 실시간 카운트다운이다.
    function ringFrame() {
      const now = performance.now();
      const p = held ? Math.min(1, (now - lastTick) / INTERVAL) : 0;
      const offset = CIRC * (1 - p);
      ringMinus!.style.strokeDashoffset = (held === "minus" ? offset : CIRC).toFixed(2);
      ringPlus!.style.strokeDashoffset = (held === "plus" ? offset : CIRC).toFixed(2);
      ringRaf = requestAnimationFrame(ringFrame);
    }
    ringRaf = requestAnimationFrame(ringFrame);

    function start(dir: number) {
      stop();
      held = dir > 0 ? "plus" : "minus";
      step(dir);
      delayTimer = setTimeout(() => {
        repeatTimer = setInterval(() => step(dir), INTERVAL);
      }, DELAY);
    }
    function stop() {
      held = null;
      if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    function wireReal(btn: HTMLButtonElement, dir: number) {
      const onDown = (e: PointerEvent) => {
        root!.classList.remove(styles.isDemo);
        stopAutoplay();
        e.preventDefault();
        start(dir);
      };
      btn.addEventListener("pointerdown", onDown);
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
      return () => {
        btn.removeEventListener("pointerdown", onDown);
        ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.removeEventListener(ev, stop));
      };
    }
    const cleanMinus = wireReal(minusBtn, -1);
    const cleanPlus = wireReal(plusBtn, 1);

    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function autoplayCycle() {
      start(1);
      setTimeout(stop, 1000);
      setTimeout(() => start(-1), 1400);
      setTimeout(stop, 2400);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayCycle();
      autoplayTimer = setInterval(autoplayCycle, 2800);
    }
    render();

    return () => {
      stopAutoplay();
      stop();
      if (ringRaf) cancelAnimationFrame(ringRaf);
      cleanMinus();
      cleanPlus();
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>재고 수량</span>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnMinus}`} type="button" aria-label="수량 줄이기">
            <svg className={styles.ring} viewBox="0 0 32 32" aria-hidden="true">
              <circle className={styles.ringTrack} cx={16} cy={16} r={14} />
              <circle className={`${styles.ringFill} ${styles.ringMinus}`} cx={16} cy={16} r={14} />
            </svg>
            <span>-</span>
          </button>
          <span className={styles.value}>12</span>
          <button className={`${styles.btn} ${styles.btnPlus}`} type="button" aria-label="수량 늘리기">
            <svg className={styles.ring} viewBox="0 0 32 32" aria-hidden="true">
              <circle className={styles.ringTrack} cx={16} cy={16} r={14} />
              <circle className={`${styles.ringFill} ${styles.ringPlus}`} cx={16} cy={16} r={14} />
            </svg>
            <span>+</span>
          </button>
        </div>
        <span className={styles.hint}>누르고 있으면 220ms마다 1씩 바뀝니다</span>
      </div>
    </div>
  );
}
