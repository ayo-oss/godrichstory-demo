// TwoLayerGradientFade — vanilla 판(04-btn-gradient-two-layer-crossfade) 의 React 포트.
// 왼쪽은 그라데이션을 통째로 교체(보간 없음), 오른쪽은 위 겹의 opacity 만 옮겨 두 그라데이션을 섞는다.
import { useEffect, useRef } from "react";
import styles from "./TwoLayerGradientFade.module.scss";

type Box<T> = { current: T };

const FADE_RATE = 6;
const START_MS = 200;
const ON_MS = 1000;
const CYCLE_MS = 2000;

export default function TwoLayerGradientFade() {
  const swapRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const fadeRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const layerRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const swapValRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const fadeValRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const swapBtn = swapRef.current;
    const fadeBtn = fadeRef.current;
    const layer = layerRef.current;
    const swapVal = swapValRef.current;
    const fadeVal = fadeValRef.current;
    if (!swapBtn || !fadeBtn || !layer || !swapVal || !fadeVal) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let amount = 0;
    let demo = !reduce;
    let pointerIn = false;
    let kbFocus = false;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    const demoOn = (now: number): boolean => demo && now >= START_MS && (now - START_MS) % CYCLE_MS < ON_MS;
    const paint = (): void => {
      layer.style.opacity = amount.toFixed(3);
      fadeVal.textContent = amount.toFixed(2);
      const on = amount >= 0.5;
      swapBtn.classList.toggle(styles.bc__on, on);
      swapVal.textContent = on ? "1" : "0";
    };
    const stopDemo = (): void => { demo = false; };
    const jump = (): void => { amount = pointerIn || kbFocus ? 1 : 0; paint(); };
    const cleanups: Array<() => void> = [];
    [swapBtn, fadeBtn].forEach((b) => {
      const onEnter = (): void => { stopDemo(); pointerIn = true; if (reduce) jump(); };
      const onLeave = (): void => { pointerIn = false; if (reduce) jump(); };
      const onFocus = (): void => { kbFocus = b.matches(":focus-visible"); if (kbFocus) stopDemo(); if (reduce) jump(); };
      const onBlur = (): void => { kbFocus = false; if (reduce) jump(); };
      b.addEventListener("pointerenter", onEnter);
      b.addEventListener("pointerleave", onLeave);
      b.addEventListener("focus", onFocus);
      b.addEventListener("blur", onBlur);
      cleanups.push(() => {
        b.removeEventListener("pointerenter", onEnter);
        b.removeEventListener("pointerleave", onLeave);
        b.removeEventListener("focus", onFocus);
        b.removeEventListener("blur", onBlur);
      });
    });

    function tick(ts: number): void {
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const g = demoOn(now) || pointerIn || kbFocus ? 1 : 0;
      amount += (g - amount) * (1 - Math.exp(-dt * FADE_RATE));
      if (Math.abs(g - amount) < 0.004) amount = g;
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) paint();
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bc}>
        <div className={styles.bc__pair}>
          <div className={styles.bc__cell}>
            <button className={styles.bc__btn} type="button" ref={swapRef}><span className={styles.bc__label}>그냥 교체</span></button>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>SWAP</span> <b ref={swapValRef}>0</b></p>
          </div>
          <div className={styles.bc__cell}>
            <button className={styles.bc__btn} type="button" ref={fadeRef}>
              <span className={styles.bc__layer} ref={layerRef}></span>
              <span className={styles.bc__label}>두 겹</span>
            </button>
            <p className={styles.bc__meta}><span className={styles.bc__tag}>OPACITY</span> <b ref={fadeValRef}>0.00</b></p>
          </div>
        </div>
      </div>
    </main>
  );
}
