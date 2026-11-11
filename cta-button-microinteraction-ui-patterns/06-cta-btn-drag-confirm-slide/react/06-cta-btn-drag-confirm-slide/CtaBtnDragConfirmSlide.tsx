import { useEffect, useRef } from "react";
import styles from "./CtaBtnDragConfirmSlide.module.scss";

export type CtaBtnDragConfirmSlideProps = {
  color?: string;
};

export default function CtaBtnDragConfirmSlide({
  color = "#0a4fe8",
}: CtaBtnDragConfirmSlideProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    const thumb = root.querySelector<HTMLButtonElement>(`.${styles.thumb}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!track || !thumb || !hint) return;

    // 계산 겹: 끄는 위치 값을 트랙 폭 대비 비율(0~1)로 clamp 하고, THRESH(0.7)를 넘겼는지로
    // 확정 여부를 가른다. 기준 미달로 놓이면 목표(0)까지 매 프레임 lerp(스프링 복귀)한다.
    const THRESH = 0.7;
    const THUMB_W = 40;
    let pos = 0, target = 0, raf: number | null = null, confirmed = false;

    function maxTravel() { return track!.clientWidth - THUMB_W - 8; }
    function apply(p: number) {
      const mt = maxTravel();
      thumb!.style.transform = "translateX(" + (p * mt).toFixed(1) + "px)";
    }
    function settle() {
      const diff = target - pos;
      pos += diff * 0.3;
      if (Math.abs(diff) < 0.002) { pos = target; }
      apply(pos);
      raf = Math.abs(target - pos) > 0.002 ? requestAnimationFrame(settle) : null;
    }
    function goTo(p: number) {
      target = p;
      if (raf === null) { raf = requestAnimationFrame(settle); }
    }
    function release(p: number) {
      if (p >= THRESH) {
        confirmed = true;
        goTo(1);
        hint!.textContent = "확정되었습니다";
        window.setTimeout(() => { confirmed = false; goTo(0); hint!.textContent = "기준(70%)을 넘겨야 확정됩니다"; }, 500);
      } else {
        goTo(0);
      }
    }

    let dragging = false, startX = 0, startPos = 0;
    function onDown(clientX: number) {
      if (confirmed) return;
      dragging = true; startX = clientX; startPos = pos;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onMove(clientX: number) {
      if (!dragging) return;
      const mt = maxTravel();
      const dp = (clientX - startX) / mt;
      pos = Math.max(0, Math.min(1, startPos + dp));
      apply(pos);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      release(pos);
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientX); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientX); }
    thumb.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    apply(0);

    let autoTarget = 0, autoTimer: number | null = null;
    function autoTick() {
      autoTarget = autoTarget >= 1 ? 0 : Math.min(1, autoTarget + 0.35);
      pos = autoTarget;
      apply(pos);
      if (autoTarget >= 1) { release(1); }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 220); }

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      thumb.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <div className={styles.track}>
          <span className={styles.trackLabel}>밀어서 결제 확정</span>
          <button className={styles.thumb} type="button" aria-label="밀어서 확정" style={{ background: color }} />
        </div>
        <span className={styles.hint}>기준(70%)을 넘겨야 확정됩니다</span>
      </div>
    </div>
  );
}
