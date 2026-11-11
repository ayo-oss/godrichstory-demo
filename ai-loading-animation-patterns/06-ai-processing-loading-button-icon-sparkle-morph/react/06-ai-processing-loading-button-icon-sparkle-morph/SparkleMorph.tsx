// SparkleMorph — vanilla 판(run/403/demo/06-ai-processing-loading-button-icon-sparkle-morph/index.html) 의 React 포트.
// 버튼 아이콘의 path 값을 스피너 모양에서 반짝임(스파클) 모양으로 미리 정해 두고, 완료 값이
// false 에서 true 로 바뀌는 순간 그 path 값만 보간해 모양을 바꾼다. SVG 정점 보간 + rAF.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SparkleMorph.module.scss";

export type SparkleMorphProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const FLIP_AT = LOOP * 0.5;
const MORPH_MS = 0.32;
const ROT_SPEED = 220;
const R_RING = 26, R_OUT = 40, R_IN = 13;
const FIELD_LABEL = "버튼 아이콘 스파클 모프 실험판";

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function pt(ang: number, r: number): [number, number] { return [r * Math.cos(ang), r * Math.sin(ang)]; }
function buildPath(radii: number[], angOffset: number): string {
  let d = "";
  for (let i = 0; i < 8; i++) {
    const ang = angOffset + i * Math.PI / 4;
    const p = pt(ang, radii[i]);
    d += (i === 0 ? "M" : "L") + p[0].toFixed(2) + "," + p[1].toFixed(2) + " ";
  }
  return d + "Z";
}

export default function SparkleMorph({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: SparkleMorphProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const doneRef = useRef(false) as Box<boolean>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const path = pathRef.current;
    const pctEl = pctRef.current;
    if (!path) return;
    const t = sec % LOOP;
    const localFlip = t - FLIP_AT;

    if (localFlip >= 0) { doneRef.current = true; } else { doneRef.current = false; }
    const done = doneRef.current;

    const morphT = done ? smooth(clamp01(localFlip / MORPH_MS)) : 0;
    const radii: number[] = [];
    for (let i = 0; i < 8; i++) {
      const spinnerR = R_RING;
      const sparkleR = (i % 2 === 0) ? R_OUT : R_IN;
      radii[i] = spinnerR + (sparkleR - spinnerR) * morphT;
    }
    const angleOffset = ((sec * ROT_SPEED) % 360) * Math.PI / 180;
    const rot = done ? angleOffset * 0.12 : angleOffset;
    path.setAttribute("d", buildPath(radii, rot));

    let pulse = 1;
    if (done && localFlip < 0.5) {
      pulse = 1 + 0.22 * Math.sin(clamp01(localFlip / 0.5) * Math.PI);
    }
    path.setAttribute("transform", "scale(" + pulse.toFixed(3) + ")");
    path.setAttribute("fill", done ? "var(--done)" : "var(--spin)");

    if (pctEl) pctEl.textContent = done ? "완료" : "처리중";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
  }
  function restart(): void { t0Ref.current = performance.now(); draw(0); }
  function onKey(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
  }
  function onClick(): void { togglePause(); }
  function onResize(): void {
    if (pausedRef.current || reduced()) draw((performance.now() - t0Ref.current) / 1000);
  }
  function frame(now: number): void {
    if (!pausedRef.current) draw((now - t0Ref.current) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    t0Ref.current = performance.now();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const root = rootRef.current;
      if (root) root.classList.add("is-still");
      draw(LOOP * 0.62);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 56v56a8 8 0 0 1-16 0V91.3l-25.6 25.7A80 80 0 1 1 174 60a8 8 0 1 1-9 13.2A64 64 0 1 0 179.7 128H216a8 8 0 0 1 0 16h-56a8 8 0 0 1-8-8V80a8 8 0 0 1 16 0v20.7L192.7 76A80.1 80.1 0 0 0 64 128a8 8 0 0 1-16 0a96 96 0 0 1 163.6-68.3L224 71.3V56a8 8 0 0 1 8 8" opacity=".2"/><path d="M224 48a8 8 0 0 0-8 8v15.3l-11.7-11.6a96 96 0 1 0 27.6 51.6a8 8 0 0 0-15.8 2.5a80 80 0 1 1-23-43l-25.7 25.7A8 8 0 0 0 173 112h56a8 8 0 0 0 8-8V56a8 8 0 0 0-13-8"/></g></svg>
          <span>클릭하거나 스페이스바를 누르면 멈추거나 다시 갑니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKey}
        >
          <button className={styles.btn} type="button" tabIndex={-1}>
            <svg className={styles.btnIco} viewBox="-46 -46 92 92" aria-hidden="true">
              <path ref={pathRef}></path>
            </svg>
          </button>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>처리중</span></b>
        </div>
      </div>
    </main>
  );
}
