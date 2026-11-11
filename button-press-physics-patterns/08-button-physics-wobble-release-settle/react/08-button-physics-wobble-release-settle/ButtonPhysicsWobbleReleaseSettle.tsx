import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsWobbleReleaseSettle.module.scss";

export type ButtonPhysicsWobbleReleaseSettleProps = {
  color?: string;
};

export default function ButtonPhysicsWobbleReleaseSettle({
  color = "#c2361a",
}: ButtonPhysicsWobbleReleaseSettleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: angle(t) = AMPLITUDE0 * e^(-DECAY*t) * sin(FREQ*t) — 지수 감쇠 사인파로
    // 좌우 회전 각도를 직접 계산한다(키프레임이 아니라 매 프레임 값 대입). DECAY 가 클수록
    // 빨리 잦아들고, FREQ 가 클수록 더 촘촘하게 떤다.
    const AMPLITUDE0 = 9, DECAY = 5.2, FREQ = 26;
    let t0 = 0, raf: number | null = null;

    function paint(angle: number) { btn!.style.transform = "rotate(" + angle.toFixed(2) + "deg)"; }
    function tick(now: number) {
      const t = (now - t0) / 1000;
      const angle = AMPLITUDE0 * Math.exp(-DECAY * t) * Math.sin(FREQ * t);
      paint(angle);
      if (Math.abs(angle) < 0.15 && t > 0.15) { paint(0); raf = null; return; }
      raf = requestAnimationFrame(tick);
    }
    function release() {
      if (reduce) { paint(0); return; }
      if (raf !== null) { cancelAnimationFrame(raf); }
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function onPointerUp() { stopAutoplay(); release(); }
    btn.addEventListener("pointerup", onPointerUp);
    paint(0);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { release(); autoTimer = window.setInterval(release, 1400); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bwr}>
        <button className={styles.btn} type="button" style={{ background: color }}>다시 시도</button>
        <p className={styles.hint}>손을 떼면 흔들림 값이 줄어들며 멈춥니다</p>
      </div>
    </div>
  );
}
