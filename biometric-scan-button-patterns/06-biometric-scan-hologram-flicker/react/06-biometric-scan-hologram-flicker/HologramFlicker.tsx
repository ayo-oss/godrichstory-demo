// HologramFlicker — vanilla 판(run/371/demo/06-biometric-scan-hologram-flicker/index.html) 의 React 포트.
// 계산 겹(결정적 노이즈 플리커)은 useEffect 안에 있다: Math.random 없이 서로 다른 주기의 사인 3개를
// 가중합해 노이즈 값을 만들고, 매 프레임 그 값으로 불투명도를 계산한다.
import { useEffect, useRef, useState } from "react";
import styles from "./HologramFlicker.module.scss";

type Box<T> = { current: T };

const STRINGS: Record<string, string> = { on: "투사 중", off: "전원 꺼짐" };

export default function HologramFlicker() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const glyphRef = useRef(null) as unknown as Box<SVGGElement>;
  const lineRefs = useRef([]) as unknown as Box<SVGRectElement[]>;
  const [status, setStatus] = useState(STRINGS.on);
  const [pressed, setPressed] = useState(true);

  useEffect(() => {
    const FREQS = [0.013, 0.031, 0.007];
    const WEIGHTS = [0.5, 0.32, 0.18];
    const PHASES = [0, 1.7, 3.4];
    const LINE_PHASE_STEP = 0.6;
    const BASE = 0.55, RANGE = 0.42;
    const WSUM = WEIGHTS[0] + WEIGHTS[1] + WEIGHTS[2];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const glyph = glyphRef.current;
    const lines = lineRefs.current;
    if (!root || !glyph || lines.length === 0) return;

    let isDemo = true;
    let active = true;
    let rafId = 0;

    function noise(t: number, phaseOffset: number) {
      let v = 0;
      for (let i = 0; i < 3; i++) {
        v += WEIGHTS[i] * Math.sin(t * FREQS[i] + PHASES[i] + phaseOffset);
      }
      return v / WSUM;
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }

    function toggle() {
      active = !active;
      setPressed(active);
      setStatus(active ? STRINGS.on : STRINGS.off);
    }

    function onClick() { human(); toggle(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    function loop(ts: number) {
      const run = active && (isDemo ? !reduce : true);
      if (run) {
        glyph.style.opacity = (BASE + RANGE * noise(ts, 0)).toFixed(3);
        for (let i = 0; i < lines.length; i++) {
          const v = BASE + RANGE * noise(ts, i * LINE_PHASE_STEP + 1);
          lines[i].style.opacity = Math.max(0, Math.min(1, v)).toFixed(3);
        }
      } else {
        glyph.style.opacity = active ? "1" : "0.08";
        for (let j = 0; j < lines.length; j++) lines[j].style.opacity = active ? "0.7" : "0";
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.holoWrap}>
        <button
          type="button"
          className={styles.holo + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.holoIcon} viewBox="0 0 120 120" aria-hidden="true">
            <g ref={glyphRef}>
              <path className={styles.holoRidge} d="M20,90 A40 36 0 0 1 100,90" />
              <path className={styles.holoRidge} d="M30,90 A30 27 0 0 1 90,90" />
              <path className={styles.holoRidge} d="M40,90 A20 19 0 0 1 80,90" />
            </g>
            {[30, 50, 70, 96].map((y, i) => (
              <rect
                key={i}
                className={styles.holoLine}
                x={14}
                y={y}
                width={92}
                height={2}
                ref={(el: SVGRectElement | null) => { if (el) lineRefs.current[i] = el; }}
              />
            ))}
          </svg>
          <span className={styles.holoLabel}>홀로그램 인증표</span>
        </button>
        <p className={styles.holoStatus}>{status}</p>
      </div>
    </main>
  );
}
