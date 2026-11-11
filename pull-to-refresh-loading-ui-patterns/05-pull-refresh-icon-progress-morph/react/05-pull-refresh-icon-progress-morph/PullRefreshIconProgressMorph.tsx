import { useEffect, useRef } from "react";
import styles from "./PullRefreshIconProgressMorph.module.scss";

export type PullRefreshIconProgressMorphProps = {
  color?: string;
};

export default function PullRefreshIconProgressMorph({
  color = "#5b8cf8",
}: PullRefreshIconProgressMorphProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const bar = root.querySelector<SVGCircleElement>(`.${styles["ring-bar"]}`);
    const check = root.querySelector<SVGPolylineElement>(`.${styles.check}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !bar || !check || !hint) return;

    // 계산 겹: 당김 거리(raw)를 REF 로 나눈 progress(0~1)를 원 둘레(C)에 곱해
    // strokeDashoffset 을 직접 놓는다 — 프레임마다 새 각도를 계산하는 것이지 CSS 트랜지션이 아니다.
    const REF = 130, MAX = 150;
    const R = 22, C = 2 * Math.PI * R;
    bar.style.strokeDasharray = C.toFixed(2);
    const checkLen = check.getTotalLength();
    check.style.strokeDasharray = checkLen.toFixed(2);
    check.style.strokeDashoffset = checkLen.toFixed(2);

    function ringOf(progress: number) { return C * (1 - progress); }

    function apply(raw: number) {
      const progress = Math.max(0, Math.min(1, raw / REF));
      bar!.style.strokeDashoffset = ringOf(progress).toFixed(2);
      const pct = Math.round(progress * 100);
      hint!.textContent = progress >= 1 ? "놓으면 새로고침" : (raw > 4 ? ("당김 진행 " + pct + "%") : "아래로 당기세요");
    }

    let committing = false, commitTimer: number | null = null;
    function commit() {
      committing = true;
      hint!.textContent = "새로고침 완료";
      let start: number | null = null;
      const dur = 320;
      function step(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / dur);
        check!.style.strokeDashoffset = (checkLen * (1 - t)).toFixed(2);
        if (t < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
      commitTimer = window.setTimeout(() => {
        check!.style.strokeDashoffset = checkLen.toFixed(2);
        committing = false;
        bar!.style.strokeDashoffset = C.toFixed(2);
        hint!.textContent = "아래로 당기세요";
        apply(0);
      }, 760);
    }

    let raw = 0, target = 0, raf: number | null = null;
    function settle() {
      raw += (target - raw) * 0.28;
      if (Math.abs(target - raw) < 0.3) raw = target;
      apply(raw);
      raf = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf === null) { raf = requestAnimationFrame(settle); } }

    let dragging = false, startY = 0, startRaw = 0;
    function onDown(y: number) {
      if (committing) return;
      dragging = true; startY = y; startRaw = raw;
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(MAX, startRaw + (y - startY)));
      apply(raw);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (raw >= REF) { commit(); } else { goTo(0); }
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.style.touchAction = "none";
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    apply(0);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (committing) return;
      autoRaw += 22;
      if (autoRaw >= REF) { raw = REF; apply(raw); autoRaw = 0; commit(); return; }
      raw = autoRaw; apply(raw);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (commitTimer !== null) { window.clearTimeout(commitTimer); }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 190); }

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
      <div className={styles.prim}>
        <div className={styles.phone}>
          <div className={styles.ringwrap}>
            <svg className={styles.ring} viewBox="0 0 56 56" width="56" height="56">
              <circle className={styles["ring-track"]} cx="28" cy="28" r="22" />
              <circle className={styles["ring-bar"]} cx="28" cy="28" r="22" style={{ "--accent": color } as any} />
              <polyline className={styles.check} points="17,29 24,36 40,19" />
            </svg>
          </div>
          <div className={styles.list}>
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
        </div>
        <span className={styles.hint}>아래로 당기세요</span>
      </div>
    </div>
  );
}
