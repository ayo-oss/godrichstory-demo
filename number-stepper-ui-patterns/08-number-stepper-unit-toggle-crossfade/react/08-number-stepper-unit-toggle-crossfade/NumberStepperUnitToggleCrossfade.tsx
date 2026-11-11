import { useEffect, useRef } from "react";
import styles from "./NumberStepperUnitToggleCrossfade.module.scss";

export type NumberStepperUnitToggleCrossfadeProps = {
  color?: string;
};

export default function NumberStepperUnitToggleCrossfade({
  color = "#0a4fe8",
}: NumberStepperUnitToggleCrossfadeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btnPlus = root.querySelector<HTMLButtonElement>(`.${styles.btnPlus}`);
    const btnMinus = root.querySelector<HTMLButtonElement>(`.${styles.btnMinus}`);
    const btnToggle = root.querySelector<HTMLButtonElement>(`.${styles.toggle}`);
    const flipBox = root.querySelector<HTMLDivElement>(`.${styles.flipBox}`);
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const unitEl = root.querySelector<HTMLElement>(`.${styles.unit}`);
    if (!btnPlus || !btnMinus || !btnToggle || !flipBox || !valueEl || !unitEl) return;

    const MIN_KG = 1, MAX_KG = 200, STEP_KG = 1;
    const FACTOR = 2.20462;
    let baseKg = 20;
    let unit: "kg" | "lb" = "kg";
    let flipRaf: number | null = null;

    function displayValue() {
      if (unit === "kg") { return String(baseKg); }
      return (Math.round(baseKg * FACTOR * 10) / 10).toFixed(1);
    }
    function render() {
      valueEl!.firstChild!.textContent = displayValue();
      unitEl!.textContent = unit;
    }

    function bump() {
      valueEl!.style.transform = "scale(1.1)";
      setTimeout(() => { valueEl!.style.transform = "scale(1)"; }, 90);
    }

    function setKg(next: number) {
      next = Math.max(MIN_KG, Math.min(MAX_KG, next));
      if (next === baseKg) { return; }
      baseKg = next;
      render();
      bump();
    }

    // 계산 겹: 카드가 0~180도 도는 동안 |cos(angle)| 로 세로 비율을 계산해 90도 지점에서
    // 두께가 0 이 되게 만들고, 그 순간(딱 한 프레임)에 값을 실제 환산식(factor 곱)으로 바꿔 끼운다 —
    // 겹쳐서 흐려지는 크로스페이드가 아니라 진짜로 "뒤집혀서 바뀌는" 컷이다.
    function flipToggle() {
      if (flipRaf) { cancelAnimationFrame(flipRaf); }
      const duration = 340;
      const start = performance.now();
      let swapped = false;
      function frame(now: number) {
        const t = Math.min(1, (now - start) / duration);
        const angle = t * Math.PI;
        const scaleY = Math.abs(Math.cos(angle));
        flipBox!.style.transform = "scaleY(" + Math.max(0.06, scaleY).toFixed(3) + ")";
        if (!swapped && t >= 0.5) {
          unit = unit === "kg" ? "lb" : "kg";
          render();
          swapped = true;
        }
        if (t < 1) {
          flipRaf = requestAnimationFrame(frame);
        } else {
          flipBox!.style.transform = "scaleY(1)";
          flipRaf = null;
        }
      }
      flipRaf = requestAnimationFrame(frame);
    }

    const onPlus = () => { root!.classList.remove(styles.isDemo); stopAutoplay(); setKg(baseKg + STEP_KG); };
    const onMinus = () => { root!.classList.remove(styles.isDemo); stopAutoplay(); setKg(baseKg - STEP_KG); };
    const onToggle = () => { root!.classList.remove(styles.isDemo); stopAutoplay(); flipToggle(); };
    btnPlus.addEventListener("click", onPlus);
    btnMinus.addEventListener("click", onMinus);
    btnToggle.addEventListener("click", onToggle);

    const seq = ["bump", "bump", "flip", "bump", "flip", "bump"];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(() => {
        const op = seq[idx % seq.length];
        idx += 1;
        if (op === "flip") { flipToggle(); } else { setKg(baseKg + (Math.random() > 0.5 ? 3 : -3)); }
      }, 700);
    }
    render();

    return () => {
      stopAutoplay();
      if (flipRaf) cancelAnimationFrame(flipRaf);
      btnPlus!.removeEventListener("click", onPlus);
      btnMinus!.removeEventListener("click", onMinus);
      btnToggle!.removeEventListener("click", onToggle);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>짐 무게</span>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnMinus}`} aria-label="1 감소" type="button">−</button>
          <div className={styles.flipBox}>
            <span className={styles.value}>20<small className={styles.unit}>kg</small></span>
          </div>
          <button className={`${styles.btn} ${styles.btnPlus}`} aria-label="1 증가" type="button">+</button>
        </div>
        <button className={styles.toggle} type="button">kg ⇄ lb 단위 바꾸기</button>
      </div>
    </div>
  );
}
