import { useEffect, useRef } from "react";
import styles from "./NumberStepperKeyboardShiftJump.module.scss";

export type NumberStepperKeyboardShiftJumpProps = {
  color?: string;
};

export default function NumberStepperKeyboardShiftJump({
  color = "#0a4fe8",
}: NumberStepperKeyboardShiftJumpProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const box = root.querySelector<HTMLDivElement>(`.${styles.box}`);
    const valueEl = root.querySelector<HTMLSpanElement>(`.${styles.value}`);
    const ghost = root.querySelector<HTMLSpanElement>(`.${styles.ghost}`);
    if (!box || !valueEl || !ghost) return;

    const MIN = 0, MAX = 200;
    let value = 40;
    let raf: number | null = null;

    function render() { valueEl!.textContent = String(value); }

    // 계산 겹: 점프 폭(delta)의 로그값으로 잔상 이동 거리를 계산한다 — 1씩 바뀌면 살짝,
    // Home/End 처럼 크게 뛰면 잔상이 더 멀리 더 오래 미끄러지며 사라진다(고정 키프레임이 아니다).
    function jump(oldVal: number, delta: number) {
      ghost!.textContent = String(oldVal);
      const dist = Math.min(46, 12 + Math.log2(1 + Math.abs(delta)) * 13);
      const dir = delta >= 0 ? -1 : 1;
      const dur = Math.min(520, 220 + Math.abs(delta));
      const start = performance.now();
      if (raf) { cancelAnimationFrame(raf); }
      ghost!.style.opacity = "1";
      function frame(now: number) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        ghost!.style.transform = "translateY(" + (dir * dist * eased).toFixed(1) + "px)";
        ghost!.style.opacity = (1 - eased).toFixed(3);
        if (t < 1) {
          raf = requestAnimationFrame(frame);
        } else {
          ghost!.style.opacity = "0";
          raf = null;
        }
      }
      raf = requestAnimationFrame(frame);
      valueEl!.style.transform = "scale(1.12)";
      setTimeout(() => { valueEl!.style.transform = "scale(1)"; }, 30);
    }

    function commit(next: number) {
      next = Math.max(MIN, Math.min(MAX, next));
      if (next === value) { return; }
      const delta = next - value;
      const old = value;
      value = next;
      render();
      jump(old, delta);
    }

    const onKeydown = (e: KeyboardEvent) => {
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
      if (e.key === "ArrowUp") { commit(value + (e.shiftKey ? 10 : 1)); e.preventDefault(); }
      else if (e.key === "ArrowDown") { commit(value - (e.shiftKey ? 10 : 1)); e.preventDefault(); }
      else if (e.key === "Home") { commit(MIN); e.preventDefault(); }
      else if (e.key === "End") { commit(MAX); e.preventDefault(); }
    };
    box.addEventListener("keydown", onKeydown);

    const seq = [1, 1, 10, -1, -200, 200, -10];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(() => {
        const d = seq[idx % seq.length];
        idx += 1;
        commit(d <= -100 ? MIN : d >= 100 ? MAX : value + d);
      }, 620);
    }
    render();

    return () => {
      stopAutoplay();
      if (raf) cancelAnimationFrame(raf);
      box!.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>할당 포인트</span>
        <div
          className={styles.box}
          tabIndex={0}
          role="spinbutton"
          aria-valuemin={0}
          aria-valuemax={200}
          aria-label="포인트 조절, 화살표는 1씩 Shift+화살표는 10씩"
        >
          <span className={styles.ghost} />
          <span className={styles.value}>40</span>
        </div>
        <span className={styles.hint}>↑↓ 1씩 · Shift 10씩 · Home/End 끝값</span>
      </div>
    </div>
  );
}
