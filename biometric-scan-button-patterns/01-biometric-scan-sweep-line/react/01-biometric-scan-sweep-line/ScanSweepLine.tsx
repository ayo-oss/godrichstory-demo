// ScanSweepLine — vanilla 판(run/371/demo/01-biometric-scan-sweep-line/index.html) 의 React 포트.
// 계산 겹(능선 stagger 순서 계산)은 useScanSweep 훅 안에 있다: 능선 정점(apex) y 와 스캔 라인 y 의
// 차를 GLOW_BAND 로 나눈 활성 값(act)을 매 프레임 svg style.opacity 에 반영한다.
import { useEffect, useRef, useState } from "react";
import styles from "./ScanSweepLine.module.scss";

type Box<T> = { current: T };

const RIDGES = [
  { apex: 72, d: "M10,118 A50 46 0 0 1 110,118" },
  { apex: 77, d: "M16,118 A44 41 0 0 1 104,118" },
  { apex: 82, d: "M22,118 A38 36 0 0 1 98,118" },
  { apex: 87, d: "M28,118 A32 31 0 0 1 92,118" },
  { apex: 92, d: "M34,118 A26 26 0 0 1 86,118" },
  { apex: 97, d: "M40,118 A20 21 0 0 1 80,118" },
  { apex: 102, d: "M46,118 A14 16 0 0 1 74,118" },
];

const STRINGS: Record<string, string> = { idle: "대기 중", scanning: "스캔 중", done: "스캔 완료" };

function useScanSweep(
  rootRef: Box<HTMLButtonElement>,
  beamRef: Box<SVGLineElement>,
  ridgeRefs: Box<SVGPathElement[]>,
  setStatus: (s: string) => void,
  setPressed: (b: boolean) => void
) {
  useEffect(() => {
    const SWEEP_SPEED = 1.4; // 변형 01: SWEEP_SPEED 1.4 → 0.6
    const BASE_MS = 1000;
    const GLOW_BAND = 16;
    const HOLD_MS = 500;
    const GAP_MS = 700;
    const TOP = 6, BOTTOM = 124;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DUR = reduce ? 1 : BASE_MS / SWEEP_SPEED;

    const root = rootRef.current;
    const beam = beamRef.current;
    const ridges = ridgeRefs.current;
    if (!root || !beam || ridges.length === 0) return;

    let isDemo = true;
    let running = false;
    let startTs = 0;
    let rafId = 0;

    function apply(scanY: number) {
      beam.setAttribute("y1", scanY.toFixed(2));
      beam.setAttribute("y2", scanY.toFixed(2));
      for (let i = 0; i < ridges.length; i++) {
        const apex = RIDGES[i].apex;
        const act = Math.max(0, Math.min(1, (scanY - apex) / GLOW_BAND + 0.001));
        ridges[i].style.opacity = (0.26 + 0.74 * act).toFixed(3);
      }
    }

    function runScan(ts: number) {
      if (!startTs) startTs = ts;
      const t = ts - startTs;
      if (t <= DUR) {
        apply(TOP + (BOTTOM - TOP) * (t / DUR));
        setStatus(STRINGS.scanning);
        rafId = requestAnimationFrame(runScan);
      } else if (t <= DUR + HOLD_MS) {
        apply(BOTTOM);
        setStatus(STRINGS.done);
        rafId = requestAnimationFrame(runScan);
      } else {
        apply(TOP);
        setStatus(STRINGS.idle);
        running = false;
        setPressed(false);
      }
    }

    function trigger() {
      if (running) return;
      running = true;
      startTs = 0;
      setPressed(true);
      rafId = requestAnimationFrame(runScan);
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }
    function onClick() { human(); trigger(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    apply(TOP);

    let cycleStart = 0;
    const PERIOD = DUR + HOLD_MS + GAP_MS;
    function loop(ts: number) {
      if (isDemo && !reduce) {
        if (!cycleStart) cycleStart = ts;
        const phase = (ts - cycleStart) % PERIOD;
        if (phase < 16 && !running) trigger();
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
}

export default function ScanSweepLine() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const beamRef = useRef(null) as unknown as Box<SVGLineElement>;
  const ridgeRefs = useRef([]) as unknown as Box<SVGPathElement[]>;
  const [status, setStatus] = useState(STRINGS.idle);
  const [pressed, setPressed] = useState(false);

  useScanSweep(rootRef, beamRef, ridgeRefs, setStatus, setPressed);

  return (
    <main className={styles.stage}>
      <div className={styles.scanWrap}>
        <button
          type="button"
          className={styles.scan + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.scanIcon} viewBox="0 0 120 130" aria-hidden="true">
            {RIDGES.map((r, i) => (
              <path
                key={i}
                className={styles.scanRidge}
                d={r.d}
                ref={(el: SVGPathElement | null) => { if (el) ridgeRefs.current[i] = el; }}
              />
            ))}
            <line className={styles.scanBeam} ref={beamRef} x1={6} x2={114} y1={6} y2={6} />
          </svg>
          <span className={styles.scanLabel}>지문 스캔</span>
        </button>
        <p className={styles.scanStatus}>{status}</p>
      </div>
    </main>
  );
}
