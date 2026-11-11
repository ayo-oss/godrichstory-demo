import { useEffect, useRef } from "react";
import styles from "./PullRefreshRubberBandOverscroll.module.scss";

export type PullRefreshRubberBandOverscrollProps = {
  color?: string;
};

export default function PullRefreshRubberBandOverscroll({
  color = "#0a4fe8",
}: PullRefreshRubberBandOverscrollProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const marker = root.querySelector<HTMLSpanElement>(`.${styles.marker}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !marker || !list || !hint) return;

    // 계산 겹: LINEAR(70px) 까지는 raw 에 0.9 배로 거의 그대로 따라가다가, 그 뒤로는 MAX_D(120px) 에
    // 점근하는 지수 감쇠(1-e^-x/K)로 늘어나는 폭이 급격히 줄어든다 — 같은 힘이라도 한계 근처에선 거의 안 늘어난다.
    const LINEAR = 70, MAX_D = 120, K = 42, RAW_MAX = 260;
    const TRACK_H = 92, SCALE = TRACK_H / 150;

    function displayedOf(raw: number) {
      if (raw <= LINEAR) return raw * 0.9;
      const base = LINEAR * 0.9;
      const excess = raw - LINEAR;
      return base + (MAX_D - base) * (1 - Math.exp(-excess / K));
    }

    function apply(raw: number) {
      const displayed = displayedOf(raw);
      marker!.style.transform = "translateY(" + (-(displayed * SCALE)).toFixed(1) + "px)";
      list!.style.transform = "translateY(" + (displayed * 0.55).toFixed(1) + "px)";
      const pctOfCap = Math.round((displayed / MAX_D) * 100);
      hint!.textContent = raw > 4 ? ("밀림 " + Math.round(displayed) + "px · 한계의 " + pctOfCap + "%") : "아래로 당기세요";
    }

    let raw = 0, target = 0, raf: number | null = null;
    function settle() {
      raw += (target - raw) * 0.3;
      if (Math.abs(target - raw) < 0.3) raw = target;
      apply(raw);
      raf = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf === null) { raf = requestAnimationFrame(settle); } }

    let dragging = false, startY = 0, startRaw = 0;
    function onDown(y: number) {
      dragging = true; startY = y; startRaw = raw;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(RAW_MAX, startRaw + (y - startY)));
      apply(raw);
    }
    function onUp() { if (!dragging) return; dragging = false; goTo(0); }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.style.touchAction = "none";
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    apply(0);

    // 자동 루프: raw 를 RAW_MAX 까지 크게 밀어 넣어 한계선에 점근만 하고 못 넘는 모습을 보인다.
    let autoRaw = 0, autoTimer: number | null = null, autoDir = 1;
    function autoTick() {
      autoRaw += autoDir * 55;
      if (autoRaw >= RAW_MAX) { autoRaw = RAW_MAX; autoDir = -1; goTo(0); return; }
      if (autoRaw <= 0 && autoDir < 0) { autoRaw = 0; autoDir = 1; }
      if (autoDir > 0) { raw = autoRaw; apply(raw); }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 170); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prrbo}>
        <div className={styles.panel}>
          <div className={styles.track}>
            <span className={styles.cap} style={{ "--accent": color } as any} />
            <span className={styles.marker} />
          </div>
          <div className={styles.phone}>
            <div className={styles.list}>
              <div className={styles.row} />
              <div className={styles.row} />
            </div>
          </div>
        </div>
        <span className={styles.hint}>아래로 당기세요</span>
      </div>
    </div>
  );
}
