import { useEffect, useRef } from "react";
import styles from "./PullRefreshReleaseSpringSettle.module.scss";

export type PullRefreshReleaseSpringSettleProps = {
  color?: string;
};

export default function PullRefreshReleaseSpringSettle({
  color = "#5b8cf8",
}: PullRefreshReleaseSpringSettleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const marker = root.querySelector<HTMLSpanElement>(`.${styles.marker}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !marker || !list || !hint) return;

    // 계산 겹: 놓는 순간부터는 값을 보간(lerp)하는 게 아니라 위치·속도를 매 프레임 적분한다
    // (스프링 힘 -K*(pos-target) + 감쇠 -C*vel). 임계감쇠보다 C 가 작아 목표를 지나쳐 반동한 뒤 잦아든다.
    const SCALE = 0.35, REF = 110, MAX = 150;
    const K = 170, C = 9;

    let pos = 0, vel = 0, target = 0, integrating = false, dragging = false;
    let startY = 0, startPos = 0;
    let committing = false, pendingCommit = false, commitTimer: number | null = null;

    function render() {
      const y = -(pos * SCALE);
      marker!.style.transform = "translateY(" + y.toFixed(1) + "px)";
      list!.style.transform = "translateY(" + (Math.max(0, pos) * 0.3).toFixed(1) + "px)";
      if (committing) { hint!.textContent = "새로고침 중"; }
      else if (pos > 4) { hint!.textContent = "밀림 " + Math.round(pos) + "px"; }
      else if (pos < -2) { hint!.textContent = "되돌림 " + Math.round(-pos) + "px"; }
      else { hint!.textContent = "아래로 당기세요"; }
    }

    function commit() {
      committing = true;
      hint!.textContent = "새로고침 중";
      commitTimer = window.setTimeout(() => {
        committing = false;
        hint!.textContent = "아래로 당기세요";
      }, 560);
    }

    let last: number | null = null;
    let rafId: number | null = null;
    function frame(now: number) {
      if (last === null) last = now;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (integrating) {
        const accel = -K * (pos - target) - C * vel;
        vel += accel * dt;
        pos += vel * dt;
        if (Math.abs(pos - target) < 0.5 && Math.abs(vel) < 5) {
          pos = target; vel = 0; integrating = false;
          if (pendingCommit) { pendingCommit = false; commit(); }
        }
      }
      render();
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function onDown(y: number) {
      if (committing) return;
      dragging = true; integrating = false; vel = 0; startY = y; startPos = pos;
    }
    function onMove(y: number) {
      if (!dragging) return;
      pos = Math.max(0, Math.min(MAX, startPos + (y - startY)));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      pendingCommit = pos >= REF;
      target = 0; integrating = true;
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.style.touchAction = "none";
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (committing || integrating || dragging) return;
      autoRaw += 14;
      if (autoRaw >= REF) {
        pos = autoRaw; pendingCommit = pos >= REF; target = 0; integrating = true; autoRaw = 0; return;
      }
      pos = autoRaw;
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
      <div className={styles.prsp}>
        <div className={styles.panel}>
          <div className={styles.track}>
            <span className={styles.rest} />
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
