// RadiusLadder — vanilla 판(run/372/demo/07-corner-shape-radius-ladder/index.html) 의 React 포트.
// 사다리 칸 사이를 3차 ease-in-out 으로 보간한다 — 칸이 바뀌어도 값이 뚝 끊기지 않는다.
import { useEffect, useRef } from "react";
import styles from "./RadiusLadder.module.scss";

type Box<T> = { current: T };

const RUNGS = [4, 12, 20, 28, 36]; // 사다리 칸마다의 반경 값(px) — 오름차순 고정 목록
const STEP_MS = 380; // 한 칸 사이를 보간하는 데 걸리는 시간
const AUTO_MS = 620; // 자동 루프에서 한 칸에 머무는 시간

export default function RadiusLadder() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rungRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS = CSS.supports("corner-shape", "squircle");

    const root = rootRef.current;
    const card = cardRef.current;
    const rungEl = rungRef.current;
    const readout = readoutRef.current;
    if (!root || !card || !rungEl || !readout) return;

    let isDemo = true;
    let idx = 0;
    let fromR = RUNGS[0];
    let toR = RUNGS[0];
    let stepStart = 0;
    let dir = 1;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    // 계산 겹: 사다리 칸 사이를 3차 ease-in-out 으로 보간한다 — 칸이 바뀌어도 값이 뚝 끊기지 않는다
    function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function currentR(ts: number) {
      const t = STEP_MS > 0 ? Math.min(1, (ts - stepStart) / STEP_MS) : 1;
      return fromR + (toR - fromR) * easeInOutCubic(t);
    }

    function goTo(nextIdx: number, ts: number) {
      nextIdx = Math.max(0, Math.min(RUNGS.length - 1, nextIdx));
      if (nextIdx === idx) return;
      fromR = currentR(ts);
      idx = nextIdx;
      toR = RUNGS[idx];
      stepStart = ts;
      rungEl!.textContent = String(idx + 1);
    }

    function applyRadius(r: number) {
      if (SUPPORTS) (card!.style as any).cornerShape = "squircle";
      card!.style.borderRadius = r.toFixed(2) + "px";
      readout!.textContent = "반경 " + r.toFixed(1);
    }

    function onClick() { human(); goTo(idx + 1 >= RUNGS.length ? 0 : idx + 1, performance.now()); }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      human();
      goTo(idx + (e.key === "ArrowUp" ? 1 : -1), performance.now());
    }
    card.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);

    let start = 0;
    function loop(ts: number) {
      if (!start) { start = ts; stepStart = ts; }
      if (isDemo) {
        if (reduce) {
          idx = RUNGS.length - 1; toR = RUNGS[idx]; fromR = toR;
          rungEl!.textContent = String(idx + 1);
        } else if ((ts - stepStart) >= AUTO_MS) {
          let next = idx + dir;
          if (next >= RUNGS.length) { dir = -1; next = idx + dir; }
          if (next < 0) { dir = 1; next = idx + dir; }
          goTo(next, ts);
        }
      }
      applyRadius(currentR(ts));
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      card.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.card}
          ref={cardRef}
          type="button"
          aria-label="반경 사다리 한 칸 오르기 (방향키로 오르내리기)"
        >
          <span ref={rungRef}>1</span><span className={styles.of}>/5</span>
        </button>
        <p className={styles.readout} ref={readoutRef} aria-live="polite">반경 4.0</p>
      </div>
    </main>
  );
}
