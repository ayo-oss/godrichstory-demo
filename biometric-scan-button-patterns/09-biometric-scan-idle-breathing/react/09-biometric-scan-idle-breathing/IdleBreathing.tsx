// IdleBreathing — vanilla 판(run/371/demo/09-biometric-scan-idle-breathing/index.html) 의 React 포트.
// 계산 겹(사인 이징 호흡)은 useEffect 안에 있다: scale = 1 + AMPLITUDE*sin(t*OMEGA) 를 매 프레임
// 직접 계산해 아이콘에 적용한다 — 능선마다 위상차를 둬 밝기가 안에서 바깥으로 번진다.
import { useEffect, useRef, useState } from "react";
import styles from "./IdleBreathing.module.scss";

type Box<T> = { current: T };

const RIDGE_D = [
  "M10,118 A50 46 0 0 1 110,118",
  "M16,118 A44 41 0 0 1 104,118",
  "M22,118 A38 36 0 0 1 98,118",
  "M28,118 A32 31 0 0 1 92,118",
  "M34,118 A26 26 0 0 1 86,118",
  "M40,118 A20 21 0 0 1 80,118",
  "M46,118 A14 16 0 0 1 74,118",
];

export default function IdleBreathing() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const iconRef = useRef(null) as unknown as Box<SVGSVGElement>;
  const ridgesRef = useRef([]) as unknown as Box<(SVGPathElement | null)[]>;
  const [status, setStatus] = useState("대기 중");
  const [pressed, setPressed] = useState(true);

  useEffect(() => {
    const AMPLITUDE = 0.095;
    const OMEGA = 0.0026;
    const RIDGE_PHASE_STEP = 0.16;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const icon = iconRef.current;
    if (!root || !icon) return;

    let isDemo = true;
    let active = true;
    let rafId = 0;
    let startTs = 0;

    function render(t: number) {
      const s = 1 + AMPLITUDE * Math.sin(t * OMEGA);
      icon!.style.transform = "scale(" + s.toFixed(4) + ")";
      const ridges = ridgesRef.current;
      for (let i = 0; i < ridges.length; i++) {
        const el = ridges[i];
        if (!el) continue;
        const phase = t * OMEGA + i * RIDGE_PHASE_STEP;
        const b = 0.5 + 0.5 * Math.sin(phase);
        el.style.opacity = b.toFixed(3);
      }
    }

    function resetIcon() {
      icon!.style.transform = "scale(1)";
      const ridges = ridgesRef.current;
      for (let i = 0; i < ridges.length; i++) {
        const el = ridges[i];
        if (el) el.style.opacity = "0.72";
      }
    }

    function loop(ts: number) {
      if (!startTs) startTs = ts;
      render(ts - startTs);
      rafId = requestAnimationFrame(loop);
    }

    function setActive(v: boolean) {
      active = v;
      setPressed(v);
      setStatus(v ? "대기 중" : "일시 정지됨");
      cancelAnimationFrame(rafId);
      if (!v) { resetIcon(); return; }
      if (reduce) { render(0); return; }
      startTs = 0;
      rafId = requestAnimationFrame(loop);
    }

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }
    function onClick() { human(); setActive(!active); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    setActive(true);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.breatheWrap}>
        <button
          type="button"
          className={styles.breathe + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.icon} ref={iconRef} viewBox="0 0 120 130" aria-hidden="true">
            {RIDGE_D.map((d, i) => (
              <path
                key={i}
                className={styles.ridge}
                d={d}
                ref={(el: SVGPathElement | null) => { ridgesRef.current[i] = el; }}
              />
            ))}
          </svg>
          <span className={styles.label}>인증 대기</span>
        </button>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
