// StepBranchPathMorph — vanilla 판(04-step-precision-branch-path-morph) 의 React 포트.
// 값 하나: 선택에 따라 갈라지는 경로는 CSS 트랜지션이 아니라 매 프레임 SVG path `d` 의
// 제어점 x좌표를 lerp(fromX, targetX, easeOutCubic(t)) 로 다시 써서 얻는다 — 좌표 자체가 보간된다.
import { useEffect, useRef, useState } from "react";
import styles from "./StepBranchPathMorph.module.scss";

type Box<T> = { current: T };
type Choice = "a" | "b" | null;

const STEP_BRANCH_MORPH_MS = 420;
const CENTER_X = 50;
const TARGET_A_X = 20;
const TARGET_B_X = 80;
const MAX_OFFSET = TARGET_B_X - CENTER_X; // 표시 레이어 정규화 기준(로직 무관)

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function buildPath(midX: number, endX: number): string {
  return "M50 42 C50 58 " + midX.toFixed(2) + " 68 " + endX.toFixed(2) + " 86";
}
function currentX(pathEl: SVGPathElement | null): number {
  if (!pathEl) return CENTER_X;
  const d = pathEl.getAttribute("d") || "";
  const m = /C50 58 ([\-0-9.]+) 68/.exec(d);
  return m ? parseFloat(m[1]) : CENTER_X;
}

export default function StepBranchPathMorph() {
  const [choice, setChoiceState] = useState<Choice>(null);
  const [reduce, setReduce] = useState(false);
  const choiceRef = useRef<Choice>(null) as Box<Choice>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathARef = useRef<SVGPathElement | null>(null);
  const pathBRef = useRef<SVGPathElement | null>(null);
  const dotARef = useRef<SVGCircleElement | null>(null);
  const dotBRef = useRef<SVGCircleElement | null>(null);
  const frameRef = useRef<number>(0) as Box<number>;
  const progressRef = useRef<{ a: number; b: number }>({ a: 0, b: 0 }) as Box<{ a: number; b: number }>;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function paintProgress(): void {
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty("--bm-progress", Math.max(progressRef.current.a, progressRef.current.b).toFixed(3));
  }

  function applyMorph(key: "a" | "b", pathEl: SVGPathElement | null, targetX: number, fromX: number): void {
    if (!pathEl) return;
    if (reduce) {
      pathEl.setAttribute("d", buildPath(targetX, targetX));
      progressRef.current[key] = clamp(Math.abs(targetX - CENTER_X) / MAX_OFFSET, 0, 1);
      paintProgress();
      return;
    }
    let start = 0;
    function step(now: number): void {
      if (start === 0) start = now;
      const t = clamp((now - start) / STEP_BRANCH_MORPH_MS, 0, 1);
      const eased = easeOutCubic(t);
      const x = lerp(fromX, targetX, eased);
      if (pathEl) {
        pathEl.setAttribute("d", buildPath(x, x));
        const travelled = clamp(Math.abs(x - CENTER_X) / MAX_OFFSET, 0, 1);
        progressRef.current[key] = travelled;
        pathEl.style.strokeWidth = (2.4 + travelled * 2.6).toFixed(2);
        pathEl.style.filter = travelled > 0.04
          ? "drop-shadow(0 0 " + (travelled * 5.5).toFixed(1) + "px rgba(10, 79, 232, " + (travelled * 0.55).toFixed(2) + "))"
          : "none";
        paintProgress();
      }
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setChoice(next: Choice): void {
    choiceRef.current = next;
    setChoiceState(next);
    const aTarget = next === "a" ? TARGET_A_X : CENTER_X;
    const bTarget = next === "b" ? TARGET_B_X : CENTER_X;
    applyMorph("a", pathARef.current, aTarget, currentX(pathARef.current));
    applyMorph("b", pathBRef.current, bTarget, currentX(pathBRef.current));
  }

  function stopDemo(): void { demoRef.current = false; }

  useEffect(() => {
    let startTime = 0;
    let demoIdx = -1;
    const schedule: Array<{ t: number; c: Choice }> = [
      { t: 0.20, c: "a" },
      { t: 0.70, c: "b" },
      { t: 1.20, c: "a" },
      { t: 1.70, c: "b" }
    ];
    function tick(now: number): void {
      if (startTime === 0) startTime = now;
      const t = ((now - startTime) / 1000) % 2;
      if (demoRef.current) {
        if (t < schedule[0].t && demoIdx !== -1) demoIdx = -1;
        for (let i = 0; i < schedule.length; i++) {
          if (t >= schedule[i].t && demoIdx < i) { setChoice(schedule[i].c); demoIdx = i; }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  function onKeyDown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === "ArrowRight") { stopDemo(); setChoice("b"); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stopDemo(); setChoice("a"); e.preventDefault(); }
  }

  const statusText = choice === null
    ? "답을 고르면 경로가 갈라집니다"
    : choice === "a" ? "설치형 경로로 갈라졌습니다" : "구독형 경로로 갈라졌습니다";

  return (
    <main className={styles.stage}>
      <div className={styles.bm} ref={rootRef} onKeyDown={onKeyDown}>
        <svg className={styles.svg} viewBox="0 0 100 100" role="img" aria-label="설문 분기 경로">
          <path className={styles.trunk} d="M50 12 L50 42" />
          <path
            className={[styles.branch, choice === "a" ? styles.branchChosen : "", choice === "b" ? styles.branchDim : ""].join(" ")}
            ref={pathARef}
            d="M50 42 C50 58 50 68 50 86"
          />
          <path
            className={[styles.branch, choice === "b" ? styles.branchChosen : "", choice === "a" ? styles.branchDim : ""].join(" ")}
            ref={pathBRef}
            d="M50 42 C50 58 50 68 50 86"
          />
          <circle className={styles.dotStart} cx={50} cy={12} r={6} />
          <circle className={[styles.dot, choice === "a" ? styles.dotChosen : ""].join(" ")} ref={dotARef} cx={20} cy={90} r={6} />
          <circle className={[styles.dot, choice === "b" ? styles.dotChosen : ""].join(" ")} ref={dotBRef} cx={80} cy={90} r={6} />
        </svg>
        <div className={styles.labels}>
          <span className={styles.labelStart}>질문</span>
          <span className={styles.labelA}>설치형</span>
          <span className={styles.labelB}>구독형</span>
        </div>
        <p className={styles.status} aria-live="polite">{statusText}</p>
        <div className={styles.controls}>
          <button type="button" className={styles.btn} onClick={() => { stopDemo(); setChoice(choice === "a" ? null : "a"); }}>설치형 선택</button>
          <button type="button" className={styles.btn} onClick={() => { stopDemo(); setChoice(choice === "b" ? null : "b"); }}>구독형 선택</button>
          <button type="button" className={[styles.btn, styles.btnGhost].join(" ")} onClick={() => { stopDemo(); setChoice(null); }}>초기화</button>
        </div>
      </div>
    </main>
  );
}
