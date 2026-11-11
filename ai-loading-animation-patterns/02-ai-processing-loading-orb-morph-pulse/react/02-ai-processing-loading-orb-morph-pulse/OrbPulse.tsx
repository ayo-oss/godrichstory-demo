// OrbPulse — vanilla 판(run/403/demo/02-ai-processing-loading-orb-morph-pulse/index.html) 의 React 포트.
// 대기 시간 값을 사인 이징에 넣어 오브 크기·블러를 숨쉬듯 반복시키고, 대기 시간이 쌓일수록 폭이 커진다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./OrbPulse.module.scss";

export type OrbPulseProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const BREATH_HZ = 0.9;
const AMP_BASE = 0.10;
const AMP_GROW = 0.09;
const FIELD_LABEL = "오브 숨쉬기 펄스 실험판";

function easeSine(t: number): number { return 0.5 - 0.5 * Math.cos(t * Math.PI); }

export default function OrbPulse({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: OrbPulseProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const orb = orbRef.current;
    const pctEl = pctRef.current;
    if (!orb) return;
    const t = sec % LOOP;
    const accum = Math.min(sec, LOOP) / LOOP;
    const amp = AMP_BASE + AMP_GROW * easeSine(accum);
    const wave = Math.sin(t * Math.PI * 2 * BREATH_HZ);
    const scale = 1 + amp * wave;
    const blur = 12 + 9 * Math.max(0, wave);
    const glow = 0.35 + 0.25 * Math.max(0, wave);

    orb.style.setProperty("--scale", scale.toFixed(4));
    orb.style.setProperty("--blur", blur.toFixed(1) + "px");
    orb.style.setProperty("--glow", glow.toFixed(3));

    if (pctEl) pctEl.textContent = Math.round((t / LOOP) * 100) + "%";
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
          <div className={styles.orb} ref={orbRef}></div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>대기</span></b>
        </div>
      </div>
    </main>
  );
}
