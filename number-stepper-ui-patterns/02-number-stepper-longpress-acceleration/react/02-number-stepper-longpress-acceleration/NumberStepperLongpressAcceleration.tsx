import { useEffect, useRef } from "react";
import styles from "./NumberStepperLongpressAcceleration.module.scss";

export type NumberStepperLongpressAccelerationProps = {
  color?: string;
};

export default function NumberStepperLongpressAcceleration({
  color = "#0a4fe8",
}: NumberStepperLongpressAccelerationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const minusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnMinus}`);
    const plusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnPlus}`);
    const meterFill = root.querySelector<HTMLSpanElement>(`.${styles.meterFill}`);
    if (!valueEl || !minusBtn || !plusBtn || !meterFill) return;

    const MIN = 0, MAX = 500, START = 480, FLOOR = 60, DECAY = 0.82;
    let value = 80;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ticks = 0;

    function render() { valueEl!.textContent = String(value); }

    // 계산 겹: 반복 간격을 START*DECAY^ticks 로 매 틱 다시 계산한다(지수 감쇠, 바닥은 FLOOR) —
    // setInterval 고정 주기가 아니라 재귀 setTimeout 으로 간격 자체를 갱신한다.
    function currentInterval() {
      return Math.max(FLOOR, START * Math.pow(DECAY, ticks));
    }
    function paintMeter() {
      const iv = currentInterval();
      const speed = (START - iv) / (START - FLOOR);
      meterFill!.style.transform = "scaleX(" + speed.toFixed(3) + ")";
    }

    function scheduleNext(dir: number) {
      timer = setTimeout(() => {
        value = Math.max(MIN, Math.min(MAX, value + dir * 5));
        render();
        ticks += 1;
        paintMeter();
        scheduleNext(dir);
      }, currentInterval());
    }

    function start(dir: number) {
      stop();
      ticks = 0;
      value = Math.max(MIN, Math.min(MAX, value + dir * 5));
      render();
      paintMeter();
      scheduleNext(dir);
    }
    function stop() {
      if (timer) { clearTimeout(timer); timer = null; }
      ticks = 0;
      meterFill!.style.transform = "scaleX(0)";
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
      setTimeout(stop, 1900);
      setTimeout(() => start(-1), 2300);
      setTimeout(stop, 4200);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayCycle();
      autoplayTimer = setInterval(autoplayCycle, 4700);
    }
    render();

    return () => {
      stopAutoplay();
      stop();
      cleanMinus();
      cleanPlus();
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>보유 포인트</span>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnMinus}`} type="button" aria-label="포인트 줄이기">-</button>
          <span className={styles.value}>80</span>
          <button className={`${styles.btn} ${styles.btnPlus}`} type="button" aria-label="포인트 늘리기">+</button>
        </div>
        <div className={styles.meter}>
          <span className={styles.meterFill} />
        </div>
        <span className={styles.hint}>오래 누를수록 간격이 짧아집니다</span>
      </div>
    </div>
  );
}
