// CheckDraw — vanilla 판(run/368/demo/01-custom-checkbox-check-draw/index.html) 의 React 포트.
// path.getTotalLength() 로 실측한 체크 선 길이를 easeOutCubic 로 rAF 적분해 strokeDashoffset 을
// 그린다 — CSS transition 이 아니라 계산으로 선을 그린다.
import { useEffect, useRef } from "react";
import styles from "./CheckDraw.module.scss";

type Box<T> = { current: T };

export default function CheckDraw() {
  const rootRef = useRef(null) as unknown as Box<HTMLLabelElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const boxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const pathRef = useRef(null) as unknown as Box<SVGPathElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    let DRAW_MS = 460; // 계산 겹 상수: 체크 선이 0에서 끝까지 그려지는 데 걸리는 실제 시간(ms)
    const CYCLE_MS = 640; // 자동 루프가 체크·해제를 오가는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const input = inputRef.current;
    const path = pathRef.current;
    if (!input || !path) return;

    let isDemo = true;
    const LEN = path.getTotalLength();
    path.style.strokeDasharray = String(LEN);
    path.style.setProperty("stroke-dashoffset", String(LEN));

    let drawing = false, drawStart = 0, drawFrom = LEN, drawTo = LEN;

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function currentOffset(ts: number) {
      if (!drawing) return drawTo;
      const t = Math.min(1, (ts - drawStart) / DRAW_MS);
      return drawFrom + (drawTo - drawFrom) * easeOutCubic(t);
    }

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function setChecked(next: boolean, ts: number) {
      input!.checked = next;
      boxRef.current?.classList.toggle(styles.boxOn, next);
      drawFrom = currentOffset(ts);
      drawTo = next ? 0 : LEN;
      drawStart = ts;
      drawing = true;
    }

    function onChange() { human(); setChecked(input!.checked, performance.now()); }
    input.addEventListener("change", onChange);

    let cycleStart = 0;
    let lastState = false;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) { lastState = step; setChecked(step, ts); }
      }

      if (drawing) {
        const off = currentOffset(ts);
        path!.style.setProperty("stroke-dashoffset", String(off));
        if (Math.abs(off - drawTo) < 0.05) drawing = false;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    if (reduce) { DRAW_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      input.removeEventListener("change", onChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <label className={styles.cbd + " " + styles.isDemo} ref={rootRef}>
        <input type="checkbox" className={styles.cbdInput} ref={inputRef} />
        <span className={styles.cbdBox} ref={boxRef} aria-hidden="true">
          <svg className={styles.cbdSvg} viewBox="0 0 20 20" width={14} height={14}>
            <path ref={pathRef} className={styles.cbdPath} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.cbdText}>약관에 동의합니다</span>
      </label>
    </main>
  );
}
