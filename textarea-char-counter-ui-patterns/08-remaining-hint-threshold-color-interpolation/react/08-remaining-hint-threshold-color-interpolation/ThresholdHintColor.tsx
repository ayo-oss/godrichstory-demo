// ThresholdHintColor — vanilla 판(08-remaining-hint-threshold-color-interpolation) 의 React 포트.
// 사용 비율에 따라 색을 선형 보간하고 남은 글자 숫자를 키우며, 구간이 바뀔 때만 안내 문구를 바꾼다.
import { useEffect, useRef } from "react";
import styles from "./ThresholdHintColor.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;
type Rgb = [number, number, number];

const HINT_LIMIT = 100;
const WARN_RATIO = 0.8;
const MAX_SCALE = 1.8;
const OVER_SPAN = 0.15;
const RATIO_LERP_RATE = 10;
const MSG_FADE_MS = 220;
const START_MS = 200;
const CHUNK_MS = 130;
const HOLD_MS = 1500;

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데", "자리가 모자라", "한참을", "기다려야 했고", "배가 고파서", "메뉴판만", "계속", "뒤적였다", "그래도", "맛은", "기대 이상이었다", "후기를", "남기려고", "사진도", "찍어 두었다", "다음엔", "더 일찍", "와야겠다"];
const DEMO_TEXT = CHUNKS.join(" ");

const MINT: Rgb = [76, 212, 166];
const AMBER: Rgb = [250, 218, 140];
const PINK: Rgb = [255, 158, 187];

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function mix(a: Rgb, b: Rgb, t: number): Rgb { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function css(c: Rgb): string { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
function tint(c: Rgb, alpha: number): string { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + alpha + ")"; }
function rgbAt(ratio: number): Rgb {
  const t1 = clamp((ratio - WARN_RATIO) / (1 - WARN_RATIO), 0, 1);
  const t2 = clamp((ratio - 1) / OVER_SPAN, 0, 1);
  return mix(mix(MINT, AMBER, t1), PINK, t2);
}
function smooth(t0: number): number { const t = clamp(t0, 0, 1); return t * t * (3 - 2 * t); }
function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

export default function ThresholdHintColor() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const rowRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const remainRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const msgRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const fillRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const rowEl = rowRef.current;
    const remainEl = remainRef.current;
    const msgEl = msgRef.current;
    const fill = fillRef.current;
    const sr = srRef.current;
    if (!ta || !rowEl || !remainEl || !msgEl || !fill || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const countGraphemes = (s: string): number =>
      seg ? Array.from(seg.segment(s)).length : Array.from(s).length;

    let demo = true;
    let used = 0;
    let shownUsed = 0;
    let stage = 0;
    let swapAt = -1;
    let lastN = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paint(nowMs: number): void {
      if (!rowEl || !remainEl || !msgEl || !fill) return;
      const ratio = shownUsed / HINT_LIMIT;
      const rgb = rgbAt(ratio);
      const color = css(rgb);
      rowEl.style.background = tint(rgb, 0.18);
      const scale = lerp(1, MAX_SCALE, smooth((ratio - 0.5) / 0.6));
      remainEl.textContent = String(Math.round(HINT_LIMIT - shownUsed));
      remainEl.style.color = color;
      remainEl.style.transform = "scale(" + scale.toFixed(3) + ")";
      msgEl.style.color = color;
      fill.style.background = color;
      fill.style.transform = "scaleX(" + clamp(ratio, 0, 1).toFixed(4) + ")";
      const a = swapAt < 0 || reduce ? 1 : clamp((nowMs - swapAt) / MSG_FADE_MS, 0, 1);
      msgEl.style.opacity = a.toFixed(3);
      if (a >= 1) swapAt = -1;
    }

    function update(nowMs: number): void {
      if (!ta || !msgEl || !sr) return;
      used = countGraphemes(ta.value);
      const ratio = used / HINT_LIMIT;
      const next = ratio >= 1 ? 2 : (ratio >= WARN_RATIO ? 1 : 0);
      if (next !== stage) {
        stage = next;
        const text = next === 2 ? "한도를 넘었어요" : (next === 1 ? "곧 한도예요" : "여유 있어요");
        msgEl.textContent = text;
        sr.textContent = next === 0 ? "" : text;
        swapAt = nowMs;
      }
      if (reduce) { shownUsed = used; paint(nowMs); }
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
        if (n !== lastN) {
          lastN = n;
          ta.value = CHUNKS.slice(0, n).join(" ");
          update(now);
        }
      }
      shownUsed += (used - shownUsed) * (1 - Math.exp(-dt * RATIO_LERP_RATE));
      paint(now);
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
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
        <div className={styles.cc__hintRow} id="ccCount" ref={rowRef}>
          <span className={styles.cc__remain} ref={remainRef}>100</span>
          <span className={styles.cc__msg} ref={msgRef}>여유 있어요</span>
        </div>
        <div className={styles.cc__meter} aria-hidden="true"><i className={styles.cc__fill} ref={fillRef}></i></div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
