import { useEffect, useRef } from "react";
import styles from "./CtaBtnGlitchSplit.module.scss";

export type CtaBtnGlitchSplitProps = {
  color?: string;
};

export default function CtaBtnGlitchSplit({
  color = "#5b8cf8",
}: CtaBtnGlitchSplitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const layerA = root.querySelector<HTMLSpanElement>(`.${styles.layerA}`);
    const layerB = root.querySelector<HTMLSpanElement>(`.${styles.layerB}`);
    if (!btn || !layerA || !layerB) return;

    // 계산 겹: mulberry32 시드 난수로 어긋남 폭을 매 틱 정하고, 정해진 시간(320ms) 동안
    // TICK 간격으로 흔들다가 마지막엔 반드시 0 으로 되돌린다 — 재생마다 같은 시드로 같은 패턴.
    const SEED = 20260920;
    function mulberry32(a: number) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(SEED);
    const DURATION = 320, TICK = 40;
    let glitchTimer: number | null = null;

    function runGlitch() {
      if (glitchTimer !== null) return;
      let elapsed = 0;
      glitchTimer = window.setInterval(() => {
        elapsed += TICK;
        if (elapsed >= DURATION) {
          if (glitchTimer !== null) { window.clearInterval(glitchTimer); glitchTimer = null; }
          layerA!.style.transform = "translate(0px,0px)";
          layerB!.style.transform = "translate(0px,0px)";
          return;
        }
        const ax = (rng() - 0.5) * 10;
        const ay = (rng() - 0.5) * 4;
        const bx = (rng() - 0.5) * 10;
        const by = (rng() - 0.5) * 4;
        layerA!.style.transform = "translate(" + ax.toFixed(1) + "px," + ay.toFixed(1) + "px)";
        layerB!.style.transform = "translate(" + bx.toFixed(1) + "px," + by.toFixed(1) + "px)";
      }, TICK);
    }

    function onEnter() { stopAutoplay(); runGlitch(); }
    function onClick() { runGlitch(); }
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("focus", onEnter);
    btn.addEventListener("click", onClick);

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoplayTimer = window.setInterval(runGlitch, 900); }

    return () => {
      stopAutoplay();
      if (glitchTimer !== null) { window.clearInterval(glitchTimer); }
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("focus", onEnter);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <button className={styles.btn} type="button">
          <span className={styles.layerA}>한정판 구매</span>
          <span className={styles.layerB} aria-hidden="true" style={{ color }}>한정판 구매</span>
        </button>
        <span className={styles.hint}>호버하면 텍스트 층이 잠깐 어긋납니다</span>
      </div>
    </div>
  );
}
