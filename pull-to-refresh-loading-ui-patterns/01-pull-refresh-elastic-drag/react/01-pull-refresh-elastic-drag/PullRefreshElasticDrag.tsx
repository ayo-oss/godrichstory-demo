import { useEffect, useRef } from "react";
import styles from "./PullRefreshElasticDrag.module.scss";

export type PullRefreshElasticDragProps = {
  color?: string;
};

export default function PullRefreshElasticDrag({
  color = "#0a4fe8",
}: PullRefreshElasticDragProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const ghost = root.querySelector<HTMLSpanElement>(`.${styles.ghost}`);
    const dot = root.querySelector<HTMLSpanElement>(`.${styles.dot}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !ghost || !dot || !list || !hint) return;

    // 계산 겹: 당긴 원 거리(raw)를 밀림 거리(displayed)로 바꾸는 저항 곡선.
    // displayed = D_MAX * raw / (raw + K) — raw 가 커질수록 늘어나는 폭이 점점 좁아지는 포화 곡선(Michaelis-Menten).
    const D_MAX = 56, K = 80, RAW_MAX = 200;
    function resist(raw: number) { return D_MAX * raw / (raw + K); }

    function apply(raw: number) {
      const displayed = resist(raw);
      const ratio = displayed / D_MAX;
      ghost!.style.transform = "translateY(" + Math.min(raw, D_MAX + 24).toFixed(1) + "px)";
      ghost!.style.opacity = String(Math.min(1, raw / 30));
      dot!.style.transform = "translateY(" + displayed.toFixed(1) + "px) scale(" + (0.6 + 0.4 * ratio).toFixed(2) + ")";
      dot!.style.opacity = String(ratio);
      list!.style.transform = "translateY(" + displayed.toFixed(1) + "px)";
      hint!.textContent = raw > 4 ? ("당김 " + Math.round(raw) + "px · 밀림 " + Math.round(displayed) + "px") : "아래로 당겨보세요";
    }

    let raw = 0, target = 0, raf: number | null = null;
    function settle() {
      raw += (target - raw) * 0.28;
      if (Math.abs(target - raw) < 0.3) { raw = target; }
      apply(raw);
      raf = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf === null) { raf = requestAnimationFrame(settle); } }

    let dragging = false, startY = 0, startRaw = 0;
    function onDown(y: number) { dragging = true; startY = y; startRaw = raw; if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(RAW_MAX, startRaw + (y - startY)));
      apply(raw);
    }
    function onUp() { if (!dragging) return; dragging = false; goTo(0); }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    apply(0);

    let autoRaw = 0, autoTimer: number | null = null, autoDir = 1;
    function autoTick() {
      autoRaw += autoDir * 40;
      if (autoRaw >= RAW_MAX) { autoRaw = RAW_MAX; autoDir = -1; goTo(0); return; }
      if (autoRaw <= 0 && autoDir < 0) { autoRaw = 0; autoDir = 1; }
      if (autoDir > 0) { raw = autoRaw; apply(raw); }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 180); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.pred}>
        <div className={styles.phone}>
          <div className={styles.zone}>
            <span className={styles.ghost} />
            <span className={styles.dot} style={{ background: color }} />
          </div>
          <div className={styles.list}>
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
        </div>
        <span className={styles.hint}>아래로 당겨보세요</span>
      </div>
    </div>
  );
}
