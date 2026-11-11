import { useEffect, useRef } from "react";
import styles from "./NumberStepperTickMarkSnap.module.scss";

export type NumberStepperTickMarkSnapProps = {
  color?: string;
};

export default function NumberStepperTickMarkSnap({
  color = "#0a4fe8",
}: NumberStepperTickMarkSnapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    const handle = root.querySelector<HTMLSpanElement>(`.${styles.handle}`);
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const ticks = track ? Array.from(track.querySelectorAll<HTMLSpanElement>(`.${styles.tick}`)) : [];
    if (!track || !handle || !valueEl || ticks.length !== 11) return;

    const TICK_COUNT = 11, TRACK_W = 200, GAP = TRACK_W / (TICK_COUNT - 1);
    let currentX = 5 * GAP;
    let dragging = false, startClientX = 0, startX = 0, settleRaf: number | null = null;

    function xToIndex(x: number) { return Math.max(0, Math.min(10, Math.round(x / GAP))); }
    function nearestTickX(x: number) { return xToIndex(x) * GAP; }

    function paint(x: number) {
      handle!.style.transform = "translate(-50%, -50%) translateX(" + x.toFixed(1) + "px)";
      for (let i = 0; i < ticks.length; i++) {
        const tx = i * GAP;
        const d = Math.abs(x - tx);
        const proximity = Math.max(0, 1 - d / GAP);
        ticks[i].style.transform = "translate(-50%, -50%) scale(" + (1 + proximity * 0.9).toFixed(2) + ")";
        ticks[i].style.opacity = (0.35 + proximity * 0.65).toFixed(2);
      }
      valueEl!.textContent = String(xToIndex(x));
    }

    // 계산 겹: 놓는 순간의 위치(x0)에서 가장 가까운 눈금(target)까지 매 프레임 스프링 힘
    // (거리 * 강성 - 속도 * 감쇠)을 계산해 자석처럼 서서히 빨려 들어가게 만든다.
    const STIFF = 0.28, DAMP = 0.62;
    function springSettle(x0: number, target: number) {
      if (settleRaf) { cancelAnimationFrame(settleRaf); }
      let x = x0, v = 0;
      function frame() {
        const force = (target - x) * STIFF;
        v = (v + force) * DAMP;
        x += v;
        paint(x);
        if (Math.abs(target - x) > 0.3 || Math.abs(v) > 0.2) {
          settleRaf = requestAnimationFrame(frame);
        } else {
          x = target;
          paint(x);
          currentX = x;
          settleRaf = null;
        }
      }
      settleRaf = requestAnimationFrame(frame);
    }

    function moveTo(clientX: number) {
      const raw = Math.max(0, Math.min(TRACK_W, startX + (clientX - startClientX)));
      // 계산 겹: 가장 가까운 눈금까지 거리 비율로 자석 인력 세기(pull)를 계산해
      // 손가락 위치와 눈금 사이를 보간한다 — 드래그 중에도 살짝 끌려간다.
      const tx = nearestTickX(raw);
      const dist = Math.abs(raw - tx);
      const pull = Math.max(0, 1 - dist / (GAP * 0.9));
      const x = raw + (tx - raw) * pull * 0.55;
      currentX = x;
      paint(x);
    }

    const onDown = (e: PointerEvent) => {
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
      if (settleRaf) { cancelAnimationFrame(settleRaf); settleRaf = null; }
      dragging = true;
      startClientX = e.clientX;
      startX = currentX;
      handle!.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => { if (dragging) { moveTo(e.clientX); } };
    const onUp = () => {
      if (!dragging) { return; }
      dragging = false;
      springSettle(currentX, nearestTickX(currentX));
    };
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);

    const seq = [3, 8, 1, 6, 9, 2, 5];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(() => {
        springSettle(currentX, seq[idx % seq.length] * GAP);
        idx += 1;
      }, 850);
    }
    paint(currentX);

    return () => {
      stopAutoplay();
      if (settleRaf) cancelAnimationFrame(settleRaf);
      handle!.removeEventListener("pointerdown", onDown);
      handle!.removeEventListener("pointermove", onMove);
      handle!.removeEventListener("pointerup", onUp);
      handle!.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>화면 밝기</span>
        <span className={styles.value}>5</span>
        <div className={styles.track}>
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className={styles.tick} data-i={i} />
          ))}
          <span className={styles.handle} />
        </div>
        <span className={styles.hint}>끌어서 놓으면 가까운 눈금에 자석처럼 붙습니다</span>
      </div>
    </div>
  );
}
