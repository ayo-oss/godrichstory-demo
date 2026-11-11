// ScoopButton — vanilla 판(run/372/demo/03-corner-shape-scoop-button/index.html) 의 React 포트.
// 누르는 시간 비율을 3차 ease 로 굽혀 스쿠프 반경에 매핑한다(선형 증가가 아니다).
import { useEffect, useRef } from "react";
import styles from "./ScoopButton.module.scss";

type Box<T> = { current: T };

const SCOOP_MAX = 28; // 다 눌렀을 때 도달하는 스쿠프 반경 상한(px)
const SCOOP_MIN = 4; // 손 뗀 상태의 스쿠프 반경 하한(px)
const HOLD_MS = 700; // 하한에서 상한까지 차오르는 데 걸리는 시간
const AUTO_MS = 1600; // 자동 루프에서 누름·뗌 한 번을 왕복하는 주기

export default function ScoopButton() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const btnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "scoop");

    const root = rootRef.current;
    const btn = btnRef.current;
    const readout = readoutRef.current;
    if (!root || !btn || !readout) return;

    let isDemo = true;
    let pressed = false;
    let phaseStart = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 누르는 시간 비율을 3차 ease-out 으로 굽혀 스쿠프 반경에 매핑한다 — 선형 증가가 아니다
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    function easeInCubic(t: number) { return t * t * t; }

    function applyScoop(r: number) {
      if (SUPPORTS) {
        (btn!.style as any).cornerShape = "scoop";
      }
      btn!.style.borderRadius = r.toFixed(2) + "px";
      readout!.textContent = "스쿠프 반경 " + r.toFixed(1);
    }

    function setPressed(next: boolean, ts?: number) {
      if (pressed === next) return;
      pressed = next;
      phaseStart = ts || performance.now();
      btn!.setAttribute("aria-pressed", String(pressed));
    }

    function press() { human(); setPressed(true); }
    function release() { human(); setPressed(false); }
    function onPointerLeave() { if (pressed) release(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); } }
    function onKeyUp(e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); release(); } }

    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", onPointerLeave);
    btn.addEventListener("keydown", onKeyDown);
    btn.addEventListener("keyup", onKeyUp);

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo) {
        if (reduce) {
          applyScoop(SCOOP_MAX);
        } else {
          const t = ((ts - start) % AUTO_MS) / AUTO_MS;
          if (t < 0.5) { setPressed(true, ts); applyScoop(SCOOP_MIN + (SCOOP_MAX - SCOOP_MIN) * easeOutCubic(t * 2)); }
          else { setPressed(false, ts); applyScoop(SCOOP_MAX - (SCOOP_MAX - SCOOP_MIN) * easeInCubic((t - 0.5) * 2)); }
        }
      } else if (!reduce) {
        const elapsed = Math.min(1, (ts - phaseStart) / HOLD_MS);
        const r = pressed
          ? SCOOP_MIN + (SCOOP_MAX - SCOOP_MIN) * easeOutCubic(elapsed)
          : SCOOP_MAX - (SCOOP_MAX - SCOOP_MIN) * easeInCubic(elapsed);
        applyScoop(r);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      btn.removeEventListener("pointerdown", press);
      btn.removeEventListener("pointerup", release);
      btn.removeEventListener("pointercancel", release);
      btn.removeEventListener("pointerleave", onPointerLeave);
      btn.removeEventListener("keydown", onKeyDown);
      btn.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.btn}
          ref={btnRef}
          type="button"
          aria-pressed="false"
          aria-label="눌러서 스쿠프 깊이 키우기"
        >누르기</button>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">스쿠프 반경 4.0</p>
      </div>
    </main>
  );
}
