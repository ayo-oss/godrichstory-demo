// GhostCaret — vanilla 판(run/403/demo/08-ai-processing-loading-ghost-text-caret-reveal/index.html) 의 React 포트.
// 미리 정해 둔 결과 문장을 글자 배열로 쪼개 두고, 토큰 순번 값이 하나씩 올라갈 때마다 그 순번까지의
// 글자만 옅은 고스트 색에서 실제 색으로 바뀌며 캐럿이 그 뒤를 따라간다. 실 스트리밍 연결 없음.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GhostCaret.module.scss";

export type GhostCaretProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const LOOP = 2.0;
const AI_LOADER_TOKEN_REVEAL_MS = 62;
const FADE_MS = 130;
const BLINK_MS = 280;
const SENTENCE = "입력한 내용을 정리해 순서대로 알려드릴게요";
const CHARS = Array.from(SENTENCE);
const LEN = CHARS.length;
const FIELD_LABEL = "고스트 텍스트 캐럿 리빌 실험판";

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function rgbStr(c: [number, number, number]): string { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

export default function GhostCaret({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
}: GhostCaretProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLElement | null>(null);
  const caretRef = useRef<HTMLElement | null>(null);
  const chRefs = useRef<(HTMLElement | null)[]>([]) as Box<(HTMLElement | null)[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const colorsRef = useRef<{ ghost: [number, number, number]; real: [number, number, number] } | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function readColors(): void {
    const root = rootRef.current;
    if (!root) return;
    const cs = getComputedStyle(root);
    colorsRef.current = {
      ghost: hexToRgb(cs.getPropertyValue("--ghost").trim()),
      real: hexToRgb(cs.getPropertyValue("--real").trim()),
    };
  }

  function draw(sec: number): void {
    if (!colorsRef.current) readColors();
    const colors = colorsRef.current;
    if (!colors) return;
    const t = sec % LOOP;
    const elapsedMs = t * 1000;
    const counter = Math.max(0, Math.min(LEN, Math.floor(elapsedMs / AI_LOADER_TOKEN_REVEAL_MS)));

    for (let i = 0; i < LEN; i++) {
      const revealAt = i * AI_LOADER_TOKEN_REVEAL_MS;
      const fade = clamp01((elapsedMs - revealAt) / FADE_MS);
      const el = chRefs.current[i];
      if (el) el.style.color = rgbStr(mix(colors.ghost, colors.real, fade));
    }

    const target = counter < LEN ? chRefs.current[counter] : chRefs.current[LEN - 1];
    const caret = caretRef.current;
    const fill = fillRef.current;
    if (target && caret && fill) {
      const left = counter < LEN ? target.offsetLeft : target.offsetLeft + target.offsetWidth;
      const top = target.offsetTop;
      caret.style.transform = "translate(" + left.toFixed(1) + "px," + top.toFixed(1) + "px)";
      fill.style.width = left.toFixed(1) + "px";
    }
    const blinkOn = Math.floor(elapsedMs / BLINK_MS) % 2 === 0;
    if (caret) caret.style.opacity = blinkOn ? "1" : ".15";
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
          <i className={styles.fill} ref={fillRef} aria-hidden="true"></i>
          <p className={styles.sentence}>
            {CHARS.map((ch, i) => (
              <span key={i} className={styles.ch} ref={(el: HTMLElement | null) => { chRefs.current[i] = el; }}>{ch}</span>
            ))}
            <b className={styles.caret} ref={caretRef} aria-hidden="true"></b>
          </p>
        </div>
      </div>
    </main>
  );
}
