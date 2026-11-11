// CardStream — vanilla 판(run/403/demo/05-ai-processing-loading-card-content-stream-fill/index.html) 의 React 포트.
// 스켈레톤 줄마다 채워졌는지 여부를 값으로 두고, 위에서부터 하나씩 참으로 바뀔 때마다
// 해당 줄만 실제 텍스트 톤으로 바뀐다. rAF 로 폭·색을 함께 보간 — @keyframes 없음.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CardStream.module.scss";

export type CardStreamProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const LINE_MS = 0.24;
const FILL_MS = 0.30;
const WIDTHS = [86, 64, 92, 58, 78, 46];
const FIELD_LABEL = "카드 스트림 채움 실험판";

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
function rgbStr(c: [number, number, number]): string { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

export default function CardStream({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: CardStreamProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]) as Box<Array<HTMLDivElement | null>>;
  const fillRefs = useRef<Array<HTMLSpanElement | null>>([]) as Box<Array<HTMLSpanElement | null>>;
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const skeletonRef = useRef<[number, number, number]>([74, 69, 80]) as Box<[number, number, number]>;
  const textRef = useRef<[number, number, number]>([91, 140, 248]) as Box<[number, number, number]>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const pctEl = pctRef.current;
    const t = sec % LOOP;
    let doneCount = 0;
    for (let i = 0; i < WIDTHS.length; i++) {
      const local = t - i * LINE_MS;
      const raw = clamp01(local / FILL_MS);
      const eased = smooth(raw);
      const fillEl = fillRefs.current[i];
      const lineEl = lineRefs.current[i];
      if (fillEl) {
        fillEl.style.width = (eased * 100).toFixed(1) + "%";
        fillEl.style.background = rgbStr(mix(skeletonRef.current, textRef.current, eased));
      }
      if (lineEl) lineEl.classList.toggle(styles.isActive, raw > 0 && raw < 1);
      if (raw >= 1) doneCount++;
    }
    if (pctEl) pctEl.textContent = Math.round((doneCount / WIDTHS.length) * 100) + "%";
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
    const root = rootRef.current;
    if (!root) return;
    const cs = getComputedStyle(root);
    skeletonRef.current = hexToRgb(cs.getPropertyValue("--skeleton").trim() || "#4a4550");
    textRef.current = hexToRgb(cs.getPropertyValue("--text-tone").trim() || "#5b8cf8");
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
          <div className={styles.card}>
            <div className={styles.cardHead}><i></i><i></i><i></i></div>
            {WIDTHS.map((w, i) => (
              <div
                key={i}
                className={styles.line}
                style={{ "--w": w + "%" } as CSSProperties}
                ref={(el: HTMLDivElement | null) => { lineRefs.current[i] = el; }}
              >
                <span className={styles.lineFill} ref={(el: HTMLSpanElement | null) => { fillRefs.current[i] = el; }}></span>
              </div>
            ))}
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>채움</span></b>
        </div>
      </div>
    </main>
  );
}
