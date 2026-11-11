import { useEffect, useRef } from "react";
import styles from "./CtaBtnVuMeterTap.module.scss";

export type CtaBtnVuMeterTapProps = {
  color?: string;
};

const N = 5;

export default function CtaBtnVuMeterTap({
  color = "#4cd4a6",
}: CtaBtnVuMeterTapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const barsWrap = root.querySelector<HTMLSpanElement>(`.${styles.bars}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!btn || !barsWrap || !hint) return;

    const bars: { el: HTMLSpanElement; h: number }[] = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement("span");
      el.className = styles.bar;
      barsWrap.appendChild(el);
      bars.push({ el, h: 0.14 });
    }

    // 계산 겹: 클릭마다 막대별 목표 높이 값을 서로 다른 난수로 정하고, 매 프레임
    // 현재 높이에서 목표까지 감쇠(DECAY)시켜 실제 VU 미터의 피크-감쇠 곡선을 흉내낸다.
    const DECAY = 0.14;
    const MIN_H = 0.14;
    let raf: number | null = null;

    function render() {
      for (let i = 0; i < N; i++) {
        bars[i].el.style.height = (bars[i].h * 100).toFixed(1) + "%";
      }
    }
    function tick() {
      let moving = false;
      for (let i = 0; i < N; i++) {
        const b = bars[i];
        const diff = MIN_H - b.h;
        if (b.h > MIN_H) {
          b.h += diff * DECAY;
          if (b.h - MIN_H > 0.004) { moving = true; } else { b.h = MIN_H; }
        }
      }
      render();
      raf = moving ? requestAnimationFrame(tick) : null;
    }
    function hit() {
      for (let i = 0; i < N; i++) {
        bars[i].h = Math.max(bars[i].h, MIN_H + Math.random() * 0.82);
      }
      render();
      if (raf === null) { raf = requestAnimationFrame(tick); }
    }

    function onClick() { stopAutoplay(); hit(); }
    btn.addEventListener("click", onClick);
    render();

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { hit(); autoplayTimer = window.setInterval(hit, 420); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <button className={styles.btn} type="button" style={{ background: color }}>
          <span className={styles.bars} />
          <span className={styles.label}>알림음 켜기</span>
        </button>
        <span className={styles.hint}>클릭할 때마다 막대가 튀었다가 가라앉습니다</span>
      </div>
    </div>
  );
}
