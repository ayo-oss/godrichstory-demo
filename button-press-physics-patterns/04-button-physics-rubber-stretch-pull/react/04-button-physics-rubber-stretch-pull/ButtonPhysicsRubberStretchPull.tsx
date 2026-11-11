import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsRubberStretchPull.module.scss";

export type ButtonPhysicsRubberStretchPullProps = {
  color?: string;
};

export default function ButtonPhysicsRubberStretchPull({
  color = "#0a4fe8",
}: ButtonPhysicsRubberStretchPullProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 당긴 거리 값(dist)이 커질수록 늘어난 배율(stretch)도 커지되, 저항 상수
    // PULL_RESISTANCE 로 나눈 뒤 1-exp(-x) 를 씌워 거리가 커질수록 증가폭이 줄어드는
    // (당길수록 뻑뻑해지는) 고무줄 저항 곡선을 만든다. 놓으면 스프링(K·C)이 1로 되돌린다.
    const PULL_RESISTANCE = 130, MAX_STRETCH = 0.9, K = 260, C = 8;
    let dist = 0, stretch = 1, vel = 0, target = 1, dragging = false, startX = 0, raf: number | null = null, last = 0;

    function stretchFromDist(d: number) {
      const n = Math.max(0, d) / PULL_RESISTANCE;
      return 1 + MAX_STRETCH * (1 - Math.exp(-n));
    }
    function paint() { btn!.style.transform = "scaleX(" + stretch.toFixed(3) + ")"; }
    function springTick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      const accel = -K * (stretch - target) - C * vel;
      vel += accel * dt;
      stretch += vel * dt;
      paint();
      if (Math.abs(stretch - target) < 0.002 && Math.abs(vel) < 0.01) { stretch = target; vel = 0; paint(); raf = null; return; }
      raf = requestAnimationFrame(springTick);
    }
    function startSpring() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(springTick); } }

    function onPointerDown(e: PointerEvent) {
      stopAutoplay();
      dragging = true; startX = e.clientX;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      dist = e.clientX - startX;
      stretch = stretchFromDist(dist);
      vel = 0;
      paint();
    }
    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      target = 1;
      if (reduce) { stretch = 1; paint(); return; }
      startSpring();
    }
    btn.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    paint();

    let autoTimer: number | null = null, autoDist = 0, growing = true;
    function autoTick() {
      if (growing) {
        autoDist += 26;
        stretch = stretchFromDist(autoDist);
        paint();
        if (autoDist >= 170) { growing = false; target = 1; startSpring(); }
      } else {
        growing = true; autoDist = 0;
      }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    if (!reduce) { autoTimer = window.setInterval(autoTick, 200); }

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
      <div className={styles.brs}>
        <div className={styles.field}>
          <span className={styles.anchor} aria-hidden="true" />
          <button className={styles.btn} type="button" style={{ background: color }}>당겨보기</button>
        </div>
        <p className={styles.hint}>멀어진 거리 값만큼 늘어났다가 놓으면 되돌아갑니다</p>
      </div>
    </div>
  );
}
