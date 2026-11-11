// SafeArea — vanilla 판(run/376/demo/07-safe-area/index.html) 의 React 포트.
// 슬라이더 진행률(t)로 --safe-top/--safe-bottom 커스텀 프로퍼티를 실측 px 로 채우고
// getComputedStyle 로 실제 렌더된 padding 을 다시 잰다. 실사용 padding 규칙은 CSS 의
// env(safe-area-inset-*) 를 그대로 쓰고 --safe-top/--safe-bottom 은 데모 시뮬레이션 값이다.
import { useEffect, useRef } from "react";
import styles from "./SafeArea.module.scss";

type Box<T> = { current: T };

const SAFE_AREA_SCALE = 1.0;
const STEP_MS_TOTAL = 2000;
const MAX_INSET_PX = 24;

export default function SafeArea() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const sliderRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const contentRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const slider = sliderRef.current;
    const content = contentRef.current;
    const readout = readoutRef.current;
    if (!wrap || !slider || !content || !readout) return;

    const root = document.documentElement;
    let isDemo = true;

    function apply(t: number) {
      const top = Math.round(MAX_INSET_PX * t * SAFE_AREA_SCALE);
      const bottom = Math.round(MAX_INSET_PX * t);
      root.style.setProperty("--safe-top", top + "px");
      root.style.setProperty("--safe-bottom", bottom + "px");
      slider!.value = String(Math.round(t * 100));
      const cs = getComputedStyle(content!);
      readout!.textContent =
        "위 " + parseFloat(cs.paddingTop).toFixed(0) + "px · 아래 " + parseFloat(cs.paddingBottom).toFixed(0) + "px";
    }

    function human() {
      if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; }
    }
    function onInput() { human(); apply(Number(slider!.value) / 100); }
    slider.addEventListener("input", onInput);
    slider.addEventListener("pointerdown", human);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo && !reduce) {
        const phase = ((ts - start) % STEP_MS_TOTAL) / STEP_MS_TOTAL;
        const t = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        apply(t);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      slider!.removeEventListener("input", onInput);
      slider!.removeEventListener("pointerdown", human);
      cancelAnimationFrame(rafRef.current);
      root.style.setProperty("--safe-top", "0px");
      root.style.setProperty("--safe-bottom", "0px");
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.frameOuter}>
          <div className={styles.notchTop}></div>
          <div className={styles.frameInner}>
            <div className={styles.content} ref={contentRef}>
              <span className={styles.pill}>본문</span>
            </div>
          </div>
          <div className={styles.notchBottom}></div>
        </div>
        <input
          className={styles.slider}
          ref={sliderRef}
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          aria-label="안전 영역 시뮬레이션"
        />
        <div className={styles.readout} ref={readoutRef}>위 —px · 아래 —px</div>
      </div>
    </main>
  );
}
