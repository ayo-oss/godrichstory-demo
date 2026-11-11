import { useEffect, useRef } from "react";
import styles from "./PullRefreshRatchetTickSnap.module.scss";

export type PullRefreshRatchetTickSnapProps = {
  color?: string;
};

export default function PullRefreshRatchetTickSnap({
  color = "#0a4fe8",
}: PullRefreshRatchetTickSnapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const marker = root.querySelector<HTMLSpanElement>(`.${styles.marker}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !marker || !list || !hint) return;

    // 계산 겹: 칸 경계(TICK 배수)를 새로 지날 때마다 감쇠 진동 AMP*e^(-t/TAU)*sin(t*W) 을
    // 기준 위치에 얹는다 — 릴리즈 때 한 번이 아니라 손가락이 칸을 지날 때마다 걸리는 래칫 튐이다.
    const TICK = 22, N = 5, TRACK_H = 110, MAX_TICK = TICK * N, RAW_MAX = 150;
    const AMP = 10, TAU = 0.15, W = 26;

    let raw = 0, lastTick = 0, burstActive = false, burstStart = 0;
    let dragging = false, startY = 0, startRaw = 0;
    let rafId: number | null = null;

    function triggerBurst(now: number) { burstActive = true; burstStart = now; }

    function frame(now: number) {
      const clamped = Math.min(raw, MAX_TICK);
      const tickIndex = Math.floor(clamped / TICK);
      if (tickIndex > lastTick) triggerBurst(now);
      lastTick = tickIndex;

      const basePos = (clamped / MAX_TICK) * TRACK_H;
      let burst = 0;
      if (burstActive) {
        const t = (now - burstStart) / 1000;
        burst = AMP * Math.exp(-t / TAU) * Math.sin(t * W);
        if (t > 0.6) burstActive = false;
      }
      marker!.style.transform = "translateY(" + (-(basePos) + burst).toFixed(1) + "px)";
      list!.style.transform = "translateY(" + (clamped * 0.35).toFixed(1) + "px)";
      hint!.textContent = raw > 4 ? ("칸 " + Math.min(tickIndex, N) + "/" + N) : "아래로 당기세요";
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    let committing = false, commitTimer: number | null = null;
    function commit() {
      committing = true;
      hint!.textContent = "새로고침 중";
      commitTimer = window.setTimeout(() => {
        committing = false;
        raw = 0; lastTick = 0;
        hint!.textContent = "아래로 당기세요";
      }, 620);
    }

    function onDown(y: number) {
      if (committing) return;
      dragging = true; startY = y; startRaw = raw;
    }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(RAW_MAX, startRaw + (y - startY)));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (raw >= MAX_TICK) { commit(); } else { raw = 0; lastTick = 0; }
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.style.touchAction = "none";
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (committing) return;
      autoRaw += 16;
      if (autoRaw >= MAX_TICK) { raw = MAX_TICK; autoRaw = 0; commit(); return; }
      raw = autoRaw;
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (commitTimer !== null) { window.clearTimeout(commitTimer); }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 160); }

    return () => {
      stopAutoplay();
      if (rafId !== null) cancelAnimationFrame(rafId);
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prtk}>
        <div className={styles.panel}>
          <div className={styles.track}>
            <span className={styles.tick} style={{ bottom: "22px" }} />
            <span className={styles.tick} style={{ bottom: "44px" }} />
            <span className={styles.tick} style={{ bottom: "66px" }} />
            <span className={styles.tick} style={{ bottom: "88px" }} />
            <span className={styles.marker} style={{ "--accent": color } as any} />
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
