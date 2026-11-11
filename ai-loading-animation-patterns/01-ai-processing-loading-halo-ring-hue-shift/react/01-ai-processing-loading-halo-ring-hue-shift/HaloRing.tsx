// HaloRing — vanilla 판(run/403/demo/01-ai-processing-loading-halo-ring-hue-shift/index.html) 의 React 포트.
// conic-gradient 링을 rAF 로 회전시키고, 진행 값이 전환 구간에 들면 링 색을 완료 색 쪽으로 섞는다.
// 움직임은 CSS 커스텀 속성 갱신이 전부 맡는다 — @keyframes 없음.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./HaloRing.module.scss";

export type HaloRingProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const ROTATE_SPEED = 128;
const AI_LOADER_HUE_TRANSITION_MS = 640;
const FIELD_LABEL = "후광 링 색상 전환 실험판";

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function rgbStr(c: [number, number, number], a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

export default function HaloRing({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: HaloRingProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const bluRef = useRef<[number, number, number]>([47, 109, 246]) as Box<[number, number, number]>;
  const doneRef = useRef<[number, number, number]>([255, 210, 63]) as Box<[number, number, number]>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const ring = ringRef.current;
    const core = coreRef.current;
    const pctEl = pctRef.current;
    if (!ring || !core) return;
    const angle = (sec * ROTATE_SPEED) % 360;
    const p = (sec % LOOP) / LOOP;
    const winStart = 1 - (AI_LOADER_HUE_TRANSITION_MS / 1000) / LOOP;
    const mixT = p <= winStart ? 0 : smooth((p - winStart) / (1 - winStart));
    const col = mix(bluRef.current, doneRef.current, mixT);
    const col2 = mix(bluRef.current, doneRef.current, mixT * 0.6);

    ring.style.setProperty("--angle", angle + "deg");
    ring.style.setProperty("--c1", rgbStr(col, 1));
    ring.style.setProperty("--c2", rgbStr(col2, .35));
    const corePulse = 1 + 0.08 * Math.sin((sec * Math.PI * 2 / LOOP) * 3);
    core.style.setProperty("--core-scale", corePulse.toFixed(3));
    core.style.setProperty("--core-c", rgbStr(col, 1));

    if (pctEl) pctEl.textContent = Math.round(p * 100) + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
  }
  function restart(): void {
    t0Ref.current = performance.now();
    draw(0);
  }
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
    const root = rootRef.current;
    if (!root) return;
    const cs = getComputedStyle(root);
    bluRef.current = hexToRgb(cs.getPropertyValue("--blue").trim() || "#2f6df6");
    doneRef.current = hexToRgb(cs.getPropertyValue("--done").trim() || "#ffd23f");
    t0Ref.current = performance.now();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      root.classList.add("is-still");
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
          <div className={styles.ring} ref={ringRef}></div>
          <div className={styles.core} ref={coreRef}></div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
