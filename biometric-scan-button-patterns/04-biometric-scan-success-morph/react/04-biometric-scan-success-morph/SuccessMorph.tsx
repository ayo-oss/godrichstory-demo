// SuccessMorph — vanilla 판(run/371/demo/04-biometric-scan-success-morph/index.html) 의 React 포트.
// 계산 겹(SVG path 모핑 보간)은 useEffect 안에 있다: 원 점 배열과 체크 점 배열을 같은 점 개수(N)로
// 두고 진행값 p(0~1) 로 선형 보간해 매 프레임 path d 를 새로 만든다.
import { useEffect, useRef, useState } from "react";
import styles from "./SuccessMorph.module.scss";

type Box<T> = { current: T };

const STRINGS: Record<string, string> = { idle: "스캔 대기 중", done: "인증 성공" };

const CHECK_PTS: [number, number][] = [
  [40, 62], [52, 74], [50, 82], [36, 68], [30, 62], [36, 56],
  [50, 68], [82, 36], [88, 42], [58, 78],
];

export default function SuccessMorph() {
  const rootRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const shapeRef = useRef(null) as unknown as Box<SVGPathElement>;
  const [status, setStatus] = useState(STRINGS.idle);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const CX = 60, CY = 60, R = 30;
    const N = 10;
    const MORPH_MS = 650;
    const HOLD_MS = 550;
    const GAP_MS = 700;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DUR = reduce ? 1 : MORPH_MS;

    const root = rootRef.current;
    const shape = shapeRef.current;
    if (!root || !shape) return;

    let isDemo = true;
    let running = false;
    let startTs = 0;
    let rafId = 0;

    function circlePoint(i: number): [number, number] {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
    }

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function buildPath(p: number) {
      let d = "";
      for (let i = 0; i < N; i++) {
        const c = circlePoint(i);
        const k = CHECK_PTS[i];
        const x = lerp(c[0], k[0], p);
        const y = lerp(c[1], k[1], p);
        d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
      }
      return d + "Z";
    }

    function apply(p: number) { shape.setAttribute("d", buildPath(p)); }
    function ease(t: number) { return 1 - Math.pow(1 - t, 3); }

    function runMorph(ts: number) {
      if (!startTs) startTs = ts;
      const t = ts - startTs;
      if (t <= DUR) {
        apply(ease(t / DUR));
        setStatus(STRINGS.idle);
        rafId = requestAnimationFrame(runMorph);
      } else if (t <= DUR + HOLD_MS) {
        apply(1);
        setStatus(STRINGS.done);
        rafId = requestAnimationFrame(runMorph);
      } else if (t <= DUR + HOLD_MS + DUR) {
        apply(1 - ease((t - DUR - HOLD_MS) / DUR));
        setStatus(STRINGS.idle);
        rafId = requestAnimationFrame(runMorph);
      } else {
        apply(0);
        running = false;
        setPressed(false);
      }
    }

    function trigger() {
      if (running) return;
      running = true;
      startTs = 0;
      setPressed(true);
      rafId = requestAnimationFrame(runMorph);
    }

    function human() { if (isDemo) { root.classList.remove(styles.isDemo); isDemo = false; } }
    function onClick() { human(); trigger(); }
    function onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "Enter") human(); }
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    apply(0);

    let cycleStart = 0;
    const PERIOD = DUR * 2 + HOLD_MS + GAP_MS;
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

  return (
    <main className={styles.stage}>
      <div className={styles.morphWrap}>
        <button
          type="button"
          className={styles.morph + " " + styles.isDemo}
          ref={rootRef}
          aria-pressed={pressed}
        >
          <svg className={styles.morphIcon} viewBox="0 0 120 120" aria-hidden="true">
            <path className={styles.morphShape} ref={shapeRef} />
          </svg>
          <span className={styles.morphLabel}>인증 성공</span>
        </button>
        <p className={styles.morphStatus}>{status}</p>
      </div>
    </main>
  );
}
