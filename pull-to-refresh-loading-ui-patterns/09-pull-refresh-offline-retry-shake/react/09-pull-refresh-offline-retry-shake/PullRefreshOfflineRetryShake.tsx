import { useEffect, useRef } from "react";
import styles from "./PullRefreshOfflineRetryShake.module.scss";

export type PullRefreshOfflineRetryShakeProps = {
  color?: string;
};

export default function PullRefreshOfflineRetryShake({
  color = "#0a4fe8",
}: PullRefreshOfflineRetryShakeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const phone = root.querySelector<HTMLDivElement>(`.${styles.phone}`);
    const disc = root.querySelector<HTMLSpanElement>(`.${styles.disc}`);
    const hint = root.querySelector<HTMLSpanElement>(`.${styles.hint}`);
    if (!phone || !disc || !hint) return;

    // 계산 겹: 성공/실패는 Math.random 이 아니라 시도 횟수(attemptCount)의 홀짝으로 정해지는
    // 결정적 번갈이(1회차 실패·2회차 성공…)다. 실패 시 흔들림은 감쇠 진동 AMP*e^(-t/TAU)*sin(t*FREQ) 를
    // phone 의 translateX 에 얹는 시간 기반 계산이지, 매번 새 애니메이션 클래스를 재생시키는 게 아니다.
    const REF = 90, MAX = 130;
    const AMP = 10, TAU = 0.12, FREQ = 46;
    const readyClass = styles["disc--ready"];
    const failClass = styles["disc--fail"];
    const okClass = styles["disc--ok"];

    let raw = 0, target = 0, raf1: number | null = null;
    function apply(rawV: number) {
      const pull = Math.min(rawV, MAX) * 0.28;
      disc!.style.transform = "translateY(" + pull.toFixed(1) + "px) scale(" + (0.7 + 0.3 * Math.min(1, rawV / REF)).toFixed(2) + ")";
      disc!.classList.toggle(readyClass, rawV >= REF);
    }
    function settle() {
      raw += (target - raw) * 0.3;
      if (Math.abs(target - raw) < 0.3) raw = target;
      apply(raw);
      raf1 = raw !== target ? requestAnimationFrame(settle) : null;
    }
    function goTo(v: number) { target = v; if (raf1 === null) { raf1 = requestAnimationFrame(settle); } }

    let shaking = false, shakeStart = 0, rafFrame: number;
    function frame(now: number) {
      if (shaking) {
        const t = (now - shakeStart) / 1000;
        const off = AMP * Math.exp(-t / TAU) * Math.sin(t * FREQ);
        phone!.style.transform = "translateX(" + off.toFixed(1) + "px)";
        if (t > 0.5) { shaking = false; phone!.style.transform = "translateX(0px)"; }
      }
      rafFrame = requestAnimationFrame(frame);
    }
    rafFrame = requestAnimationFrame(frame);

    let attemptCount = 0, committing = false;
    let timers: number[] = [];
    function clearTimers() { timers.forEach((t) => window.clearTimeout(t)); timers = []; }
    function attempt() {
      attemptCount += 1;
      const fail = attemptCount % 2 === 1;
      committing = true;
      if (fail) {
        hint!.textContent = "오프라인 - 다시 시도";
        disc!.classList.add(failClass);
        shaking = true; shakeStart = performance.now();
        timers.push(window.setTimeout(() => {
          disc!.classList.remove(failClass, readyClass);
          committing = false;
          raw = 0; apply(0);
          hint!.textContent = "아래로 당기세요";
        }, 640));
      } else {
        hint!.textContent = "새로고침 완료";
        disc!.classList.add(okClass);
        timers.push(window.setTimeout(() => {
          disc!.classList.remove(okClass, readyClass);
          committing = false;
          raw = 0; apply(0);
          hint!.textContent = "아래로 당기세요";
        }, 640));
      }
    }

    let dragging = false, startY = 0, startRaw = 0;
    function onDown(y: number) {
      if (committing) return;
      dragging = true; startY = y; startRaw = raw;
      if (raf1 !== null) { cancelAnimationFrame(raf1); raf1 = null; }
    }
    function onMove(y: number) {
      if (!dragging) return;
      raw = Math.max(0, Math.min(MAX, startRaw + (y - startY)));
      apply(raw);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      if (raw >= REF) { attempt(); } else { goTo(0); }
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
      autoRaw += 18;
      if (autoRaw >= REF) { raw = REF; apply(raw); autoRaw = 0; attempt(); return; }
      raw = autoRaw; apply(raw);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      clearTimers();
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 190); }

    return () => {
      stopAutoplay();
      if (raf1 !== null) cancelAnimationFrame(raf1);
      cancelAnimationFrame(rafFrame);
      phone.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.prof}>
        <div className={styles.phone}>
          <div className={styles.zone}>
            <span className={styles.disc} style={{ "--accent": color } as any} />
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
