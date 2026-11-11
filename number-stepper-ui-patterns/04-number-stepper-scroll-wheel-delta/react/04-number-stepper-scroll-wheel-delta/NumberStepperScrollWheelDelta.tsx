import { useEffect, useRef } from "react";
import styles from "./NumberStepperScrollWheelDelta.module.scss";

export type NumberStepperScrollWheelDeltaProps = {
  color?: string;
};

export default function NumberStepperScrollWheelDelta({
  color = "#0a4fe8",
}: NumberStepperScrollWheelDeltaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panel = root.querySelector<HTMLDivElement>(`.${styles.panel}`);
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const fillUp = root.querySelector<HTMLSpanElement>(`.${styles.fillUp}`);
    const fillDown = root.querySelector<HTMLSpanElement>(`.${styles.fillDown}`);
    if (!panel || !valueEl || !fillUp || !fillDown) return;

    const MIN = 50, MAX = 200, STEP = 10, THRESH = 60;
    let value = 100;
    let residual = 0;
    let rafId: number | null = null;

    function render() { valueEl!.textContent = value + "%"; }
    function paintTrack() {
      const p = Math.min(1, Math.abs(residual) / THRESH);
      fillUp!.style.transform = "scaleX(" + (residual > 0 ? p : 0).toFixed(3) + ")";
      fillDown!.style.transform = "scaleX(" + (residual < 0 ? p : 0).toFixed(3) + ")";
    }

    // 계산 겹: 휠 delta 를 잔여값(residual)에 누적하다가 문턱(THRESH)을 넘을 때만 한 칸 커밋한다.
    // 커밋되지 않은 잔여값은 매 프레임 마찰(0.9배)로 감쇠시켜 손을 놓아도 서서히 0으로 가라앉는다.
    function applyDelta(dy: number) {
      residual += dy;
      while (residual >= THRESH) {
        value = Math.min(MAX, value + STEP);
        residual -= THRESH;
        render();
      }
      while (residual <= -THRESH) {
        value = Math.max(MIN, value - STEP);
        residual += THRESH;
        render();
      }
      paintTrack();
    }

    function decayFrame() {
      if (Math.abs(residual) > 0.5) {
        residual *= 0.90;
        paintTrack();
      } else if (residual !== 0) {
        residual = 0;
        paintTrack();
      }
      rafId = requestAnimationFrame(decayFrame);
    }
    rafId = requestAnimationFrame(decayFrame);

    const onWheel = (e: WheelEvent) => {
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
      e.preventDefault();
      applyDelta(e.deltaY);
    };
    panel.addEventListener("wheel", onWheel, { passive: false });

    const seq = [16, 16, 16, 16, -16, -16, -16, -16];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(() => {
        applyDelta(seq[idx % seq.length]);
        idx += 1;
      }, 180);
    }
    render();

    return () => {
      stopAutoplay();
      if (rafId) cancelAnimationFrame(rafId);
      panel!.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>확대 배율</span>
        <span className={styles.value}>100%</span>
        <div className={styles.track}>
          <span className={styles.fillDown} />
          <span className={styles.mid} />
          <span className={styles.fillUp} />
        </div>
        <span className={styles.hint}>휠 델타가 쌓이면 한 칸씩 바뀝니다</span>
      </div>
    </div>
  );
}
