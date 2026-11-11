// WaveformMic — vanilla 판(run/403/demo/07-ai-processing-loading-listening-waveform-mic/index.html) 의 React 포트.
// 마이크 입력 크기를 흉내 낸 합성 진폭 값을 막대마다 다르게 주고, 그 값이 오르내릴 때마다
// 막대 높이가 따라 흔들려 지금 소리를 듣고 있는 상태를 보여준다. 실 마이크·getUserMedia 없음 —
// 고정 시드(seeded) 두 사인파 합성 + rAF.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./WaveformMic.module.scss";

export type WaveformMicProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const N = 20;
const BASE_H = 8;
const MAX_H = 92;
const FIELD_LABEL = "듣는 중 파형 실험판";

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function seeded(i: number): number { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); }

type Bar = { freqA: number; freqB: number; phase: number };

const BARS: Bar[] = (() => {
  const arr: Bar[] = [];
  for (let i = 0; i < N; i++) {
    arr.push({
      freqA: 2.1 + seeded(i) * 1.8,
      freqB: 4.7 + seeded(i + 50) * 2.4,
      phase: seeded(i + 90) * Math.PI * 2,
    });
  }
  return arr;
})();

export default function WaveformMic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: WaveformMicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<(HTMLElement | null)[]>([]) as Box<(HTMLElement | null)[]>;
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const t = sec;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const q = BARS[i];
      const env = 0.5 + 0.5 * Math.sin(t * q.freqA * Math.PI * 2 + q.phase);
      const jit = Math.sin(t * q.freqB * Math.PI * 2 + q.phase * 1.7) * 0.22;
      const level = clamp01(env + jit);
      const h = BASE_H + (MAX_H - BASE_H) * level;
      const el = barRefs.current[i];
      if (el) {
        el.style.height = h.toFixed(1) + "px";
        el.style.opacity = (0.55 + level * 0.45).toFixed(2);
      }
      sum += h;
    }
    const avg = Math.round((sum / N - BASE_H) / (MAX_H - BASE_H) * 100);
    const pctEl = pctRef.current;
    if (pctEl) pctEl.textContent = avg > 8 ? "듣는 중" : "대기";
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
    if (pausedRef.current || reduced()) draw((performance.now() - t0Ref.current) / 1000 % LOOP);
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
          <div className={styles.bars}>
            {BARS.map((_, i) => (
              <i key={i} ref={(el: HTMLElement | null) => { barRefs.current[i] = el; }}></i>
            ))}
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>듣는 중</span></b>
        </div>
      </div>
    </main>
  );
}
