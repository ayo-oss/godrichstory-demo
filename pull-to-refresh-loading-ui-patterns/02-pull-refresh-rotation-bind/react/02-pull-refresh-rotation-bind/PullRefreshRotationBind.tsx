import { useEffect, useRef } from "react";
import styles from "./PullRefreshRotationBind.module.scss";

export type PullRefreshRotationBindProps = {
  color?: string;
};

export default function PullRefreshRotationBind({
  color = "#0a4fe8",
}: PullRefreshRotationBindProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const knob = root.querySelector<HTMLSpanElement>(`.${styles.knob}`);
    const list = root.querySelector<HTMLDivElement>(`.${styles.list}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !knob || !list || !hint) return;

    // 계산 겹: 당긴 거리(raw)를 기준 거리(REF)로 나눈 비율(ratio)만큼 knob 을 궤도(SWEEP도)로 돌린다.
    // ratio 가 1 이 되면 거리 연동을 놓고 각속도(SPIN_SPEED)로 계속 도는 로딩 상태로 넘어간다.
    const REF = 120, SWEEP = 270, RADIUS = 18, SPIN_SPEED = 0.62;

    function place(angleDeg: number, pullPx: number) {
      const rad = (angleDeg - 90) * Math.PI / 180;
      const x = Math.cos(rad) * RADIUS, y = Math.sin(rad) * RADIUS;
      knob!.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      list!.style.transform = "translateY(" + pullPx.toFixed(1) + "px)";
    }

    let state: "idle" | "dragging" | "spinning" = "idle";
    let raw = 0, ratio = 0, spinAngle = 0, spinStart = 0, spinRaf: number | null = null;
    function fromRatio() { return ratio * SWEEP; }

    function spinFrame(ts: number) {
      if (!spinStart) { spinStart = ts; }
      const el = ts - spinStart;
      spinAngle = (el * SPIN_SPEED) % 360;
      place(spinAngle, 24);
      if (el < 900) {
        spinRaf = requestAnimationFrame(spinFrame);
      } else {
        state = "idle"; ratio = 0; raw = 0; spinStart = 0;
        hint!.textContent = "당겨서 새로고침";
        place(0, 0);
      }
    }
    function startSpin() {
      state = "spinning";
      hint!.textContent = "불러오는 중";
      spinStart = 0;
      spinRaf = requestAnimationFrame(spinFrame);
    }

    function apply(r: number) {
      raw = r;
      ratio = Math.max(0, Math.min(1, raw / REF));
      place(fromRatio(), ratio * 24);
      hint!.textContent = ratio > 0.05 ? ("회전 " + Math.round(fromRatio()) + "도 · 비율 " + Math.round(ratio * 100) + "%") : "당겨서 새로고침";
    }

    let dragging = false, startY = 0, startRaw = 0;
    function onDown(y: number) {
      if (state === "spinning") return;
      dragging = true; state = "dragging"; startY = y; startRaw = raw;
    }
    function onMove(y: number) {
      if (!dragging) return;
      apply(Math.max(0, Math.min(REF * 1.3, startRaw + (y - startY))));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (ratio >= 1) { startSpin(); } else { state = "idle"; apply(0); }
    }

    function onPointerDown(e: PointerEvent) { stopAutoplay(); onDown(e.clientY); }
    function onPointerMove(e: PointerEvent) { onMove(e.clientY); }
    phone.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onUp);
    place(0, 0);

    let autoRaw = 0, autoTimer: number | null = null;
    function autoTick() {
      if (state === "spinning") return;
      autoRaw += 30;
      if (autoRaw >= REF) { apply(REF); startSpin(); autoRaw = 0; return; }
      apply(autoRaw);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (spinRaf !== null) { cancelAnimationFrame(spinRaf); }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 170); }

    return () => {
      stopAutoplay();
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prrb}>
        <div className={styles.phone}>
          <div className={styles.zone}>
            <span className={styles.ring} />
            <span className={styles.knob} style={{ background: color }} />
          </div>
          <div className={styles.list}>
            <div className={styles.row} />
            <div className={styles.row} />
            <div className={styles.row} />
          </div>
        </div>
        <span className={styles.hint}>당겨서 새로고침</span>
      </div>
    </div>
  );
}
