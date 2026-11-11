import { useEffect, useRef } from "react";
import styles from "./CtaBtnFlip3dFace.module.scss";

export type CtaBtnFlip3dFaceProps = {
  color?: string;
};

export default function CtaBtnFlip3dFace({
  color = "#0a4fe8",
}: CtaBtnFlip3dFaceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!btn) return;

    // 계산 겹: 회전 값이 목표(180도 배수)를 향해 감쇠 진동식으로 접근한다 —
    // 매 프레임 목표를 살짝 넘었다가(오버슈트) 스프링 곡선으로 제자리에 앉는다.
    let base = 0;
    let raf: number | null = null;
    let startT = 0;
    const OVERSHOOT_DEG = 18, FREQ = 14, DECAY = 9, DUR = 500;

    function ease(tSec: number) {
      if (tSec <= 0) return 0;
      const settle = 1 - Math.exp(-DECAY * tSec);
      const wobble = Math.sin(tSec * FREQ) * Math.exp(-DECAY * tSec) * (OVERSHOOT_DEG / 180);
      return settle + wobble;
    }
    function frame(now: number) {
      const t = (now - startT) / 1000;
      const p = Math.min(1, ease(t));
      const current = base + p * 180;
      btn!.style.transform = "rotateY(" + current.toFixed(2) + "deg)";
      if (t < DUR / 1000) {
        raf = requestAnimationFrame(frame);
      } else {
        base = base + 180;
        btn!.style.transform = "rotateY(" + base.toFixed(2) + "deg)";
        raf = null;
      }
    }
    function flip() {
      if (raf !== null) return;
      startT = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function onClick() { stopAutoplay(); flip(); }
    function onKeydown(e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { stopAutoplay(); flip(); } }
    btn.addEventListener("click", onClick);
    btn.addEventListener("keydown", onKeydown);

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoplayTimer = window.setInterval(flip, 700); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      btn.removeEventListener("click", onClick);
      btn.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <div className={styles.scene}>
          <button className={styles.btn} type="button">
            <span className={styles.faceFront} style={{ background: color }}>이 상품</span>
            <span className={styles.faceBack}>저 상품</span>
          </button>
        </div>
        <span className={styles.hint}>클릭할 때마다 반대 면으로 뒤집힙니다</span>
      </div>
    </div>
  );
}
