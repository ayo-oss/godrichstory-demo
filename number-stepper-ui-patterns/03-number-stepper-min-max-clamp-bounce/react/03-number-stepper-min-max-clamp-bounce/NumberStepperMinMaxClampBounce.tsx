import { useEffect, useRef } from "react";
import styles from "./NumberStepperMinMaxClampBounce.module.scss";

export type NumberStepperMinMaxClampBounceProps = {
  color?: string;
};

export default function NumberStepperMinMaxClampBounce({
  color = "#c2361a",
}: NumberStepperMinMaxClampBounceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const wrapEl = root.querySelector<HTMLSpanElement>(`.${styles.valueWrap}`);
    const minusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnMinus}`);
    const plusBtn = root.querySelector<HTMLButtonElement>(`.${styles.btnPlus}`);
    const edgeLeft = root.querySelector<HTMLSpanElement>(`.${styles.edgeLeft}`);
    const edgeRight = root.querySelector<HTMLSpanElement>(`.${styles.edgeRight}`);
    if (!valueEl || !wrapEl || !minusBtn || !plusBtn || !edgeLeft || !edgeRight) return;

    const MIN = 0, MAX = 8;
    let value = 4;
    let raf: number | null = null;

    function render() { valueEl!.textContent = String(value); }

    // 계산 겹: 경계에 닿는 순간부터 지난 시간(t)에 감쇠 사인파를 매 프레임 계산해
    // translateX 에 대입한다 — 목표 지점을 살짝 넘었다가 스프링 곡선으로 되돌아온다.
    const AMPLITUDE = 10, FREQ = 16, DECAY = 10;
    function overshoot(tSec: number) {
      if (tSec <= 0) { return 0; }
      return AMPLITUDE * Math.sin(tSec * FREQ) * Math.exp(-DECAY * tSec);
    }
    function bounce(dir: number) {
      const edge = dir > 0 ? edgeRight! : edgeLeft!;
      const start = performance.now();
      if (raf) { cancelAnimationFrame(raf); }
      function frame(now: number) {
        const t = (now - start) / 1000;
        const px = dir * overshoot(t);
        wrapEl!.style.transform = "translateX(" + px.toFixed(2) + "px)";
        const op = Math.max(0, 1 - t / 0.4);
        edge.style.opacity = op.toFixed(3);
        if (t < 0.45) {
          raf = requestAnimationFrame(frame);
        } else {
          wrapEl!.style.transform = "translateX(0px)";
          edge.style.opacity = "0";
          raf = null;
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function step(dir: number) {
      const next = value + dir;
      if (next > MAX || next < MIN) {
        bounce(dir);
        return;
      }
      value = next;
      render();
    }

    function wireReal(btn: HTMLButtonElement, dir: number) {
      const onClick = () => {
        root!.classList.remove(styles.isDemo);
        stopAutoplay();
        step(dir);
      };
      btn.addEventListener("click", onClick);
      return () => btn.removeEventListener("click", onClick);
    }
    const cleanMinus = wireReal(minusBtn, -1);
    const cleanPlus = wireReal(plusBtn, 1);

    const seq = [1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function autoplayTick() {
      step(seq[idx % seq.length]);
      idx += 1;
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(autoplayTick, 260);
    }
    render();

    return () => {
      stopAutoplay();
      if (raf) cancelAnimationFrame(raf);
      cleanMinus();
      cleanPlus();
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>좌석 수 (0~8)</span>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnMinus}`} type="button" aria-label="좌석 줄이기">-</button>
          <span className={styles.valueWrap}>
            <span className={`${styles.edge} ${styles.edgeLeft}`} />
            <span className={styles.value}>4</span>
            <span className={`${styles.edge} ${styles.edgeRight}`} />
          </span>
          <button className={`${styles.btn} ${styles.btnPlus}`} type="button" aria-label="좌석 늘리기">+</button>
        </div>
        <span className={styles.hint}>경계에 닿으면 살짝 넘었다가 되돌아옵니다</span>
      </div>
    </div>
  );
}
