import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsMagnetAnchorSnap.module.scss";

export type ButtonPhysicsMagnetAnchorSnapProps = {
  color?: string;
};

export default function ButtonPhysicsMagnetAnchorSnap({
  color = "#0a4fe8",
}: ButtonPhysicsMagnetAnchorSnapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const field = root.querySelector<HTMLDivElement>(`.${styles.field}`);
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!field || !btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 놓인 위치 값(x)에서 가장 가까운 고정 지점 값(ANCHORS 중 하나)을 골라 target 으로
    // 삼고, 스프링(K·C)이 목표를 살짝 넘겼다가 되돌아오는 튕김으로 그 지점에 맞춘다.
    const ANCHORS = [30, 110, 190], K = 340, C = 10, BTN_R = 20;
    let x = ANCHORS[0], vel = 0, target = ANCHORS[0], dragging = false, startX = 0, startBtnX = 0, raf: number | null = null, last = 0;

    function nearestAnchor(px: number) {
      let best = ANCHORS[0], bestD = Infinity;
      for (let i = 0; i < ANCHORS.length; i++) {
        const d = Math.abs(ANCHORS[i] - px);
        if (d < bestD) { bestD = d; best = ANCHORS[i]; }
      }
      return best;
    }
    function paint() { btn!.style.transform = "translateX(" + x.toFixed(1) + "px)"; }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      const accel = -K * (x - target) - C * vel;
      vel += accel * dt;
      x += vel * dt;
      paint();
      if (Math.abs(x - target) < 0.05 && Math.abs(vel) < 0.4) { x = target; vel = 0; paint(); raf = null; return; }
      raf = requestAnimationFrame(tick);
    }
    function startSpring() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }

    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; startX = e.clientX; startBtnX = x;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      x = Math.max(BTN_R, Math.min(field!.clientWidth - BTN_R, startBtnX + dx));
      paint();
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      target = nearestAnchor(x);
      if (reduce) { x = target; vel = 0; paint(); return; }
      startSpring();
    }
    btn.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    paint();

    let autoTimer: number | null = null, idx = 0;
    function autoTick() {
      idx = (idx + 1) % ANCHORS.length;
      x = ANCHORS[idx] + (idx % 2 === 0 ? -18 : 18);
      vel = 0;
      target = nearestAnchor(x);
      startSpring();
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 900); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bma}>
        <div className={styles.field}>
          <span className={styles.anchor} style={{ left: "30px" }} />
          <span className={styles.anchor} style={{ left: "110px" }} />
          <span className={styles.anchor} style={{ left: "190px" }} />
          <button className={styles.btn} type="button" aria-label="자리 잡는 토글 버튼" style={{ background: color }}>●</button>
        </div>
        <p className={styles.hint}>놓으면 가장 가까운 고정 지점 값으로 튕기듯 맞춰집니다</p>
      </div>
    </div>
  );
}
