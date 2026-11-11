// FrameInset — vanilla 판(run/372/demo/09-corner-shape-frame-inset/index.html) 의 React 포트.
// 인셋 산술(안쪽 반경 = 바깥 반경 − 인셋)과, 뗄 때 목표로 지수 감쇠 관성 복귀.
import { useEffect, useRef } from "react";
import styles from "./FrameInset.module.scss";

type Box<T> = { current: T };

const OUTER_R = 40; // 바깥 프레임의 고정 반경(px)
const INSET_MIN = 6; // 안쪽 곡선이 프레임에서 떨어지는 최소 거리(px)
const INSET_MAX = 22; // 최대 거리(px) — 커질수록 안쪽 곡선이 더 안으로 밀려든다
const SWEEP_MS = 2400; // 인셋이 한 번 왕복하는 주기
const INSET_SPRING_K = 8; // 뗄 때 목표로 되돌아가는 관성 속도 상수

export default function FrameInset() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const frameRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const innerRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "superellipse(1)");

    const root = rootRef.current;
    const frame = frameRef.current;
    const inner = innerRef.current;
    const readout = readoutRef.current;
    if (!root || !frame || !inner || !readout) return;

    let isDemo = true;
    let held = false;
    let insetNow = INSET_MIN;
    let lastStepTs = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 인셋 산술 — 안쪽 반경 = 바깥 반경 − 인셋. 인셋이 커질수록 안쪽 곡선이 더 깎인다
    function innerRadius(inset: number) { return Math.max(2, OUTER_R - inset); }

    function applyInset(inset: number) {
      const r = innerRadius(inset);
      if (SUPPORTS) {
        (frame!.style as any).cornerShape = "superellipse(3)";
        (inner!.style as any).cornerShape = "superellipse(3)";
      }
      frame!.style.borderRadius = OUTER_R + "px";
      inner!.style.borderRadius = r.toFixed(2) + "px";
      readout!.textContent = "인셋 " + inset.toFixed(1);
    }

    function onPointerDown() { human(); held = true; frame!.setAttribute("aria-pressed", "true"); }
    function onPointerUp() { human(); held = false; frame!.setAttribute("aria-pressed", "false"); }
    function onPointerLeave() { if (held) { held = false; frame!.setAttribute("aria-pressed", "false"); } }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onPointerDown(); } }
    function onKeyUp(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onPointerUp(); } }
    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointerleave", onPointerLeave);
    frame.addEventListener("keydown", onKeyDown);
    frame.addEventListener("keyup", onKeyUp);

    // 계산 겹: 뗄 때 인셋이 목표로 관성(지수 감쇠)으로 되돌아간다
    function stepInset(ts: number) {
      const target = held ? INSET_MAX : INSET_MIN;
      const dt = (ts - (lastStepTs || ts)) / 1000;
      lastStepTs = ts;
      const follow = 1 - Math.exp(-INSET_SPRING_K * dt);
      insetNow += (target - insetNow) * follow;
      if (Math.abs(insetNow - target) < 0.01) insetNow = target;
    }

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo) {
        if (reduce) {
          insetNow = INSET_MAX;
        } else {
          const t = ((ts - start) % SWEEP_MS) / SWEEP_MS;
          const tri = t < 0.5 ? t * 2 : (1 - t) * 2;
          insetNow = INSET_MIN + (INSET_MAX - INSET_MIN) * tri;
        }
      } else if (!reduce) {
        stepInset(ts);
      }
      applyInset(insetNow);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      frame.removeEventListener("pointerdown", onPointerDown);
      frame.removeEventListener("pointerup", onPointerUp);
      frame.removeEventListener("pointerleave", onPointerLeave);
      frame.removeEventListener("keydown", onKeyDown);
      frame.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.frame}
          ref={frameRef}
          type="button"
          aria-pressed="false"
          aria-label="안쪽 곡선 밀기/당기기"
        >
          <span className={styles.inner} ref={innerRef}>코어</span>
        </button>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">인셋 10.0</p>
      </div>
    </main>
  );
}
