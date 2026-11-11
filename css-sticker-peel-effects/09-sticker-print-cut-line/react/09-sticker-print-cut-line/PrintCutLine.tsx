// PrintCutLine — vanilla 판(run/378/demo/09-sticker-print-cut-line/index.html) 의 React 포트.
// 경과 시간에 속도를 곱한 값을 점선 마디 길이(PATTERN)로 모듈로 연산해 끊김 없이 도는
// 재단선(stroke-dashoffset)을 만든다 — SVG rect 의 stroke-dasharray 기반 마칭 앤츠.
import { useEffect, useRef } from "react";
import styles from "./PrintCutLine.module.scss";

type Box<T> = { current: T };

const DASH = 6, GAP = 4;
const MARCH_SPEED = 14;
const PATTERN = DASH + GAP;
const STEP_MS = 1700;

export default function PrintCutLine() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const dieARef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const dieBRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rectARef = useRef(null) as unknown as Box<SVGRectElement>;
  const rectBRef = useRef(null) as unknown as Box<SVGRectElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const dies = [dieARef.current, dieBRef.current];
    const rects = [rectARef.current, rectBRef.current];
    if (!wrap || dies.some((d) => !d) || rects.some((r) => !r)) return;

    rects.forEach((r) => { r!.style.strokeDasharray = DASH + " " + GAP; });

    let isDemo = true;
    const punched = [false, false];

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function togglePunch(i: number) {
      punched[i] = !punched[i];
      dies[i]!.setAttribute("aria-pressed", String(punched[i]));
      dies[i]!.classList.toggle(styles.isPunched, punched[i]);
    }
    const clickHandlers = dies.map((die, i) => {
      const fn = () => { human(); togglePunch(i); };
      die!.addEventListener("click", fn);
      return fn;
    });

    let last = 0, stepLast = 0, autoIdx = 0;
    function autoAdvance(ts: number) {
      if (ts - stepLast < STEP_MS) return;
      stepLast = ts;
      togglePunch(autoIdx);
      autoIdx = (autoIdx + 1) % dies.length;
    }

    function loop(ts: number) {
      if (!last) last = ts;
      last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      if (!reduce) {
        const offset = (ts * MARCH_SPEED / 1000) % PATTERN;
        rects.forEach((r) => { r!.style.strokeDashoffset = (-offset).toFixed(2); });
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      dies.forEach((die, i) => die!.removeEventListener("click", clickHandlers[i]));
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.sheet}>
          <button className={styles.die} ref={dieARef} type="button" aria-pressed="false" aria-label="첫 번째 스티커, 눌러서 오려내기">
            <span className={styles.dieMark} aria-hidden="true"></span>
            <svg className={styles.cutLine} viewBox="0 0 100 100" aria-hidden="true">
              <rect ref={rectARef} className={styles.cutLineRect} x={3} y={3} width={94} height={94} rx={14} />
            </svg>
          </button>
          <button className={styles.die} ref={dieBRef} type="button" aria-pressed="false" aria-label="두 번째 스티커, 눌러서 오려내기">
            <span className={styles.dieMark} aria-hidden="true"></span>
            <svg className={styles.cutLine} viewBox="0 0 100 100" aria-hidden="true">
              <rect ref={rectBRef} className={styles.cutLineRect} x={3} y={3} width={94} height={94} rx={14} />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
