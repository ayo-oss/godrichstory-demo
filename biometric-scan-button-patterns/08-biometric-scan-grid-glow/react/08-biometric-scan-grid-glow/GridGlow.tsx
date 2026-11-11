// GridGlow — vanilla 판(run/371/demo/08-biometric-scan-grid-glow/index.html) 의 React 포트.
// 계산 겹(격자 대각 스태거)은 useEffect 안에 있다: 셀마다 (행+열) 로 지연을 매겨 빛이
// 대각선으로 번져 나가는 삼각 펄스를 매 프레임 다시 계산한다 — 지연을 미리 박아두지 않는다.
import { useEffect, useRef, useState } from "react";
import styles from "./GridGlow.module.scss";

type Box<T> = { current: T };

const COLS = 6, ROWS = 6;
const CELL_COUNT = COLS * ROWS;

export default function GridGlow() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const cellsRef = useRef([]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const [status, setStatus] = useState("스캔 중");
  const [pressed, setPressed] = useState(true);

  useEffect(() => {
    const DIAG_STEP = 90;
    const CYCLE_MS = 1600;
    const PULSE_MS = 420;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    if (!root) return;

    const diagOf: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) diagOf.push(r + c);
    }

    let isDemo = true;
    let active = true;
    let rafId = 0;
    let startTs = 0;

    function pulse(local: number) {
      if (local < 0 || local >= PULSE_MS) return 0;
      return Math.sin((local / PULSE_MS) * Math.PI);
    }

    function render(t: number) {
      const els = cellsRef.current;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        const delay = diagOf[i] * DIAG_STEP;
        const local = ((t - delay) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
        const v = pulse(local);
        el.style.opacity = (0.16 + v * 0.84).toFixed(3);
        el.style.transform = "scale(" + (1 + v * 0.22).toFixed(3) + ")";
      }
    }

    function resetCells() {
      const els = cellsRef.current;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        el.style.opacity = "0.16";
        el.style.transform = "scale(1)";
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
      setStatus(v ? "스캔 중" : "스캔 정지됨");
      cancelAnimationFrame(rafId);
      if (!v) { resetCells(); return; }
      if (reduce) { render(CYCLE_MS * 0.42); return; }
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
      <div className={styles.gridWrap}>
        <button
          type="button"
          className={styles.grid + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <div className={styles.cells} aria-hidden="true">
            {Array.from({ length: CELL_COUNT }).map((_, i) => (
              <span
                key={i}
                className={styles.cell}
                ref={(el: HTMLSpanElement | null) => { cellsRef.current[i] = el; }}
              />
            ))}
          </div>
          <span className={styles.label}>지문 센서 스캔</span>
        </button>
        <p className={styles.status}>{status}</p>
      </div>
    </main>
  );
}
