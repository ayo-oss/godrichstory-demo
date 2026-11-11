import { useEffect, useRef } from "react";
import styles from "./CtaBtnProgressRingCountdown.module.scss";

export type CtaBtnProgressRingCountdownProps = {
  color?: string;
};

export default function CtaBtnProgressRingCountdown({
  color = "#0a4fe8",
}: CtaBtnProgressRingCountdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    const bar = root.querySelector<SVGCircleElement>(`.${styles.bar}`);
    if (!btn || !bar) return;

    // 계산 겹: 반지름(r)으로 둘레(circumference = 2*PI*r)를 구하고, 남은 시간 비율(progress)을
    // stroke-dashoffset = circumference * (1 - progress) 산술로 매 프레임 다시 그린다.
    const R = 38;
    const CIRC = 2 * Math.PI * R;
    bar.style.strokeDasharray = CIRC.toFixed(2);
    bar.style.strokeDashoffset = CIRC.toFixed(2);
    const DURATION = 1500;
    let raf: number | null = null;
    let startT = 0;
    let running = false;

    function frame(now: number) {
      const t = now - startT;
      const progress = Math.min(1, t / DURATION);
      const offset = CIRC * (1 - progress);
      bar!.style.strokeDashoffset = offset.toFixed(2);
      if (progress < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false; raf = null;
        btn!.textContent = "완료됨";
        window.setTimeout(() => { btn!.textContent = "다음 단계"; bar!.style.strokeDashoffset = CIRC.toFixed(2); }, 500);
      }
    }
    function startCountdown() {
      if (running) return;
      running = true;
      startT = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function onClick() { stopAutoplay(); startCountdown(); }
    btn.addEventListener("click", onClick);

    let autoplayTimer: number | null = null;
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { startCountdown(); autoplayTimer = window.setInterval(startCountdown, 2000); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <div className={styles.wrap}>
          <svg className={styles.ring} viewBox="0 0 84 84">
            <circle className={styles.track} cx={42} cy={42} r={38} />
            <circle className={styles.bar} cx={42} cy={42} r={38} style={{ stroke: color }} />
          </svg>
          <button className={styles.btn} type="button" style={{ background: color }}>다음 단계</button>
        </div>
        <span className={styles.hint}>클릭하면 1.5초 뒤 자동으로 다음 단계로 넘어갑니다</span>
      </div>
    </div>
  );
}
