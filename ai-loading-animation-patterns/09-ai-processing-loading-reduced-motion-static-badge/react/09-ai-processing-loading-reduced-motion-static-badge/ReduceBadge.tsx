// ReduceBadge — vanilla 판(run/403/demo/09-ai-processing-loading-reduced-motion-static-badge/index.html) 의 React 포트.
// 동작 줄임 설정 값을 감지해, 그 값이 켜져 있으면 애니메이션 없이 '처리 중' 문구 배지가 즉시
// 나타나고, 꺼져 있을 때만 원래 속도로 움직인다. 이 항목 자체가 접근성 정지 프레임의 주제다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ReduceBadge.module.scss";

export type ReduceBadgeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const SWITCH_AT = LOOP * 0.5;
const SPRING_MS = 0.36;
const BOUNCE_HZ = 2.4;
const FIELD_LABEL = "동작 줄임 배지 전환 실험판";

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function spring(t: number): number {
  const x = clamp01(t);
  return 1 - Math.exp(-6 * x) * Math.cos(7 * x);
}

export default function ReduceBadge({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: ReduceBadgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const dotsWrapRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<(HTMLElement | null)[]>([]) as Box<(HTMLElement | null)[]>;
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLParagraphElement | null>(null);
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function draw(sec: number): void {
    const dotsWrap = dotsWrapRef.current;
    const badge = badgeRef.current;
    const stateEl = stateRef.current;
    if (!dotsWrap || !badge) return;
    const t = sec % LOOP;
    const on = t >= SWITCH_AT;

    if (on) {
      const localT = (t - SWITCH_AT) / SPRING_MS;
      const s = spring(localT);
      badge.style.opacity = "1";
      badge.style.transform = "scale(" + (0.7 + 0.3 * s).toFixed(3) + ")";
      dotsWrap.style.opacity = "0";
      if (stateEl) stateEl.textContent = "동작 줄임: 켜짐 · 처리 중 배지";
    } else {
      badge.style.opacity = "0";
      badge.style.transform = "scale(.7)";
      dotsWrap.style.opacity = "1";
      for (let i = 0; i < dotRefs.current.length; i++) {
        const phase = i * (Math.PI * 2 / 3);
        const y = Math.sin(t * BOUNCE_HZ * Math.PI * 2 + phase);
        const el = dotRefs.current[i];
        if (el) {
          el.style.transform = "translateY(" + (y * 7).toFixed(1) + "px)";
          el.style.opacity = (0.55 + 0.45 * (0.5 + 0.5 * y)).toFixed(2);
        }
      }
      if (stateEl) stateEl.textContent = "동작 줄임: 꺼짐 · 움직이는 중";
    }
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
      draw(SWITCH_AT + SPRING_MS);
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
          <div className={styles.scene}>
            <div className={styles.dots} ref={dotsWrapRef} aria-hidden="true">
              <i ref={(el: HTMLElement | null) => { dotRefs.current[0] = el; }}></i>
              <i ref={(el: HTMLElement | null) => { dotRefs.current[1] = el; }}></i>
              <i ref={(el: HTMLElement | null) => { dotRefs.current[2] = el; }}></i>
            </div>
            <div className={styles.badge} ref={badgeRef}>
              <b className={styles.badgeDot} aria-hidden="true"></b>
              <span>처리 중</span>
            </div>
          </div>
          <p className={styles.state} ref={stateRef}>동작 줄임: 꺼짐 · 움직이는 중</p>
        </div>
      </div>
    </main>
  );
}
