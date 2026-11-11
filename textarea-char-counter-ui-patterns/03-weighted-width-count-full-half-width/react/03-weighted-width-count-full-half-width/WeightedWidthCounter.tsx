// WeightedWidthCounter — vanilla 판(03-weighted-width-count-full-half-width) 의 React 포트.
// 글자마다 코드 포인트 범위로 폭 가중치(반각 1·전각 2)를 매겨 합산하고, 칸 너비로 그린다.
import { useEffect, useRef } from "react";
import styles from "./WeightedWidthCounter.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;

const WIDTH_LIMIT = 80;
const HALF_WEIGHT = 1;
const FULL_WEIGHT = 2;
const POP_MS = 420;
const COUNT_LERP_RATE = 14;
const START_MS = 200;
const CHUNK_MS = 200;
const HOLD_MS = 1500;

const CHUNKS = ["Hello", "こんにちは", "World", "カウンター", "ABC", "文字数", "123", "ｶﾀｶﾅ", "ありがとう", "Text", "全角と半角", "mix", "ＡＢＣ", "１２３", "日本語", "kana", "おわり"];
const DEMO_TEXT = CHUNKS.join(" ");

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

function weightOf(g: string): number {
  const cp = g.codePointAt(0) || 0;
  if (cp <= 0x7e || (cp >= 0xff61 && cp <= 0xff9f)) return HALF_WEIGHT;
  return FULL_WEIGHT;
}

function popScale(age: number): number {
  if (age < 0 || age >= POP_MS) return 1;
  return 1 - Math.exp(-age / 70) * Math.cos(age / 55);
}

export default function WeightedWidthCounter() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const barRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const countRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const bar = barRef.current;
    const countEl = countRef.current;
    const sr = srRef.current;
    if (!ta || !bar || !countEl || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const graphemes = (s: string): string[] =>
      seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);

    let demo = true;
    const cells: HTMLSpanElement[] = [];
    const born: number[] = [];
    let total = 0;
    let shown = 0;
    let prevCount = 0;
    let stage = 0;
    let lastDemoN = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paintNumber(): void {
      if (!countEl) return;
      countEl.textContent = String(Math.round(shown));
      countEl.style.color = Math.round(shown) > WIDTH_LIMIT ? "rgb(255,158,187)" : "";
    }

    function update(nowMs: number): void {
      if (!ta || !bar || !sr) return;
      const list = graphemes(ta.value);
      let cum = 0;
      for (let i = 0; i < list.length; i += 1) {
        if (!cells[i]) {
          const c = document.createElement("span");
          bar.appendChild(c);
          cells.push(c);
          born.push(-1);
        }
        const w = weightOf(list[i]);
        const el = cells[i];
        el.style.display = "";
        el.style.left = (cum / WIDTH_LIMIT * 100).toFixed(3) + "%";
        el.style.width = "calc(" + (w / WIDTH_LIMIT * 100).toFixed(3) + "% - 1px)";
        const over = cum + w > WIDTH_LIMIT;
        el.className = [styles.cc__cell, over ? styles["is-over"] : (w === FULL_WEIGHT ? styles["is-full"] : styles["is-half"]), list[i] === " " ? styles["is-space"] : ""].join(" ");
        if (i >= prevCount && !reduce) born[i] = nowMs;
        cum += w;
      }
      for (let j = list.length; j < cells.length; j += 1) cells[j].style.display = "none";
      prevCount = list.length;
      total = cum;
      const next = total > WIDTH_LIMIT ? 2 : 0;
      if (next !== stage) {
        sr.textContent = next === 2 ? "폭 한도를 넘었어요" : "";
        stage = next;
      }
      if (reduce) { shown = total; paintNumber(); }
    }

    function stopDemo(): void { demo = false; }
    const onInput = (): void => { stopDemo(); update(perfNow()); };
    ta.addEventListener("focus", stopDemo);
    ta.addEventListener("keydown", stopDemo);
    ta.addEventListener("paste", stopDemo);
    ta.addEventListener("input", onInput);

    function tick(ts: number): void {
      if (!ta) return;
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const cyc = (now - START_MS) % (CHUNKS.length * CHUNK_MS + HOLD_MS);
        const n = now < START_MS ? 0 : Math.min(CHUNKS.length, Math.floor(cyc / CHUNK_MS) + 1);
        if (n !== lastDemoN) {
          if (n === 1) prevCount = 0;
          lastDemoN = n;
          ta.value = CHUNKS.slice(0, n).join(" ");
          update(now);
        }
      }
      shown += (total - shown) * (1 - Math.exp(-dt * COUNT_LERP_RATE));
      paintNumber();
      for (let m = 0; m < born.length; m += 1) {
        if (born[m] < 0) continue;
        const s = popScale(now - born[m]);
        cells[m].style.transform = s === 1 ? "" : "scaleY(" + s.toFixed(3) + ")";
        if (s === 1) born[m] = -1;
      }
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = DEMO_TEXT;
      update(0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ta.removeEventListener("focus", stopDemo);
      ta.removeEventListener("keydown", stopDemo);
      ta.removeEventListener("paste", stopDemo);
      ta.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="섞어서 입력해 보세요"></textarea>
        <div className={styles.cc__bar} ref={barRef} aria-hidden="true"></div>
        <div className={styles.cc__row}>
          <div className={styles.cc__big}><span className={styles.cc__num} id="ccCount" ref={countRef}>0</span><span className={styles.cc__unit}>/ 80 폭</span></div>
          <div className={styles.cc__legend}><span className={[styles.cc__chip, styles["cc__chip--half"]].join(" ")}>반각 1</span><span className={[styles.cc__chip, styles["cc__chip--full"]].join(" ")}>전각 2</span></div>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
