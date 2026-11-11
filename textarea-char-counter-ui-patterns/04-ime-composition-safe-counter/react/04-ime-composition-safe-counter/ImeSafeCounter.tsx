// ImeSafeCounter — vanilla 판(04-ime-composition-safe-counter) 의 React 포트.
// 조합 시작·끝 이벤트로 조합 중에는 숫자를 붙잡아 두고, 확정되는 순간 한 번에 올린다.
import { useEffect, useRef } from "react";
import styles from "./ImeSafeCounter.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;
type TimelineEvent = { t: number; kind: "start" | "step" | "end"; w: number; text: string };

const STEP_MS = 100;
const PAUSE_MS = 220;
const START_MS = 200;
const HOLD_MS = 1200;
const BUMP_MS = 440;

const WORDS: string[][] = [
  ["n", "に", "にh", "にほ", "にほn", "にほん"],
  ["k", "か", "かu", "かう", "かうn", "かうん", "かうんt", "かうんた"],
  ["m", "も", "もj", "もじ"],
  ["s", "す", "すu", "すう"],
  ["え", "えn", "えん"]
];

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

export default function ImeSafeCounter() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const rawRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const safeRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const dotRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const stateRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const preRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const rawEl = rawRef.current;
    const safeEl = safeRef.current;
    const dot = dotRef.current;
    const stateEl = stateRef.current;
    const preEl = preRef.current;
    const sr = srRef.current;
    if (!ta || !rawEl || !safeEl || !dot || !stateEl || !preEl || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const countGraphemes = (s: string): number =>
      seg ? Array.from(seg.segment(s)).length : Array.from(s).length;

    let demo = true;
    let composing = false;
    let rawCount = 0;
    let safeCount = 0;
    let bumpAt = -1;
    let t0: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paint(nowMs: number): void {
      if (!rawEl || !safeEl || !dot || !stateEl) return;
      rawEl.textContent = String(rawCount);
      safeEl.textContent = String(safeCount);
      stateEl.textContent = composing ? "조합 중" : "확정";
      dot.className = [styles.cc__dot, composing ? styles["is-on"] : ""].join(" ");
      let s = 1;
      if (bumpAt >= 0 && !reduce) {
        const age = nowMs - bumpAt;
        s = age >= BUMP_MS ? 1 : 1 + 0.5 * Math.exp(-age / 90) * Math.cos(age / 60);
        if (age >= BUMP_MS) bumpAt = -1;
      }
      safeEl.style.transform = s === 1 ? "" : "scale(" + s.toFixed(3) + ")";
      const pulse = composing && !reduce ? 0.5 + 0.5 * Math.sin(nowMs / 90) : 1;
      dot.style.opacity = composing ? (0.45 + 0.55 * pulse).toFixed(2) : "";
    }

    function onCompStart(): void { composing = true; }
    function onInputCount(): void {
      if (!ta) return;
      rawCount = countGraphemes(ta.value);
      if (!composing) safeCount = rawCount;
    }
    function onCompEnd(nowMs: number): void {
      if (!ta || !preEl || !sr) return;
      composing = false;
      preEl.textContent = "";
      const next = countGraphemes(ta.value);
      if (next !== safeCount) bumpAt = nowMs;
      safeCount = next;
      rawCount = next;
      sr.textContent = "현재 " + safeCount + "자";
    }

    function stopDemo(): void { demo = false; }
    const onCompStartEvt = (): void => { stopDemo(); onCompStart(); };
    const onCompEndEvt = (): void => { onCompEnd(perfNow()); paint(perfNow()); };
    const onInputEvt = (): void => { stopDemo(); onInputCount(); paint(perfNow()); };
    ta.addEventListener("focus", stopDemo);
    ta.addEventListener("keydown", stopDemo);
    ta.addEventListener("compositionstart", onCompStartEvt);
    ta.addEventListener("compositionend", onCompEndEvt);
    ta.addEventListener("input", onInputEvt);

    const timeline: TimelineEvent[] = [];
    const baseAt: string[] = [];
    let base = "";
    let clock = 0;
    WORDS.forEach((steps, w) => {
      baseAt.push(base);
      timeline.push({ t: clock, kind: "start", w, text: "" });
      steps.forEach((st, i) => {
        timeline.push({ t: clock + (i + 1) * STEP_MS, kind: "step", w, text: st });
      });
      const endT = clock + (steps.length + 1) * STEP_MS;
      timeline.push({ t: endT, kind: "end", w, text: steps[steps.length - 1] });
      base += steps[steps.length - 1];
      clock = endT + PAUSE_MS;
    });
    const CYCLE_MS = clock + HOLD_MS;
    let cursor = 0;
    let cycleStart = START_MS;

    function runEvent(ev: TimelineEvent, nowMs: number): void {
      if (!ta || !preEl) return;
      if (ev.kind === "start") {
        onCompStart();
      } else if (ev.kind === "step") {
        ta.value = baseAt[ev.w] + ev.text;
        preEl.textContent = ev.text;
        onInputCount();
      } else {
        ta.value = baseAt[ev.w] + ev.text;
        onCompEnd(nowMs);
      }
    }

    function tick(ts: number): void {
      if (!ta || !preEl) return;
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      if (demo && now >= START_MS) {
        let local = now - cycleStart;
        if (local >= CYCLE_MS) {
          cycleStart += CYCLE_MS;
          local = now - cycleStart;
          cursor = 0;
          ta.value = "";
          composing = false;
          rawCount = 0;
          safeCount = 0;
          preEl.textContent = "";
        }
        while (cursor < timeline.length && timeline[cursor].t <= local) {
          runEvent(timeline[cursor], now);
          cursor += 1;
        }
      }
      paint(now);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = base;
      rawCount = countGraphemes(base);
      safeCount = rawCount;
      paint(0);
      sr.textContent = "현재 " + safeCount + "자";
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ta.removeEventListener("focus", stopDemo);
      ta.removeEventListener("keydown", stopDemo);
      ta.removeEventListener("compositionstart", onCompStartEvt);
      ta.removeEventListener("compositionend", onCompEndEvt);
      ta.removeEventListener("input", onInputEvt);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="일본어로 입력해 보세요"></textarea>
        <div className={styles.cc__pair}>
          <div className={styles.cc__card}>
            <span className={styles.cc__cardLabel}>바로 세기</span>
            <span className={[styles.cc__num, styles["cc__num--raw"]].join(" ")} ref={rawRef}>0</span>
          </div>
          <div className={[styles.cc__card, styles["cc__card--safe"]].join(" ")}>
            <span className={styles.cc__cardLabel}>조합 보류</span>
            <span className={styles.cc__num} id="ccCount" ref={safeRef}>0</span>
          </div>
          <div className={styles.cc__state}>
            <span className={styles.cc__dot} ref={dotRef}></span>
            <span className={styles.cc__stateText} ref={stateRef}>확정</span>
            <span className={styles.cc__pre} ref={preRef}></span>
          </div>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
