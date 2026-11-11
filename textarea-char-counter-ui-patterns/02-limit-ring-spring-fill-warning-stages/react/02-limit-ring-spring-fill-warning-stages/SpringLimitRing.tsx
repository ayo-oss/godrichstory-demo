// SpringLimitRing — vanilla 판(02-limit-ring-spring-fill-warning-stages) 의 React 포트.
// 사용 비율을 링 호 길이로 바꾸고 스프링으로 따라가게 한다. 색은 선형 보간, 한도를 넘으면 감쇠 사인으로 흔들린다.
import { useEffect, useRef } from "react";
import styles from "./SpringLimitRing.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;
type Rgb = [number, number, number];

const CHAR_LIMIT = 120;
const RING_SPRING_STIFFNESS = 220;
const RING_SPRING_DAMPING = 14;
const WARN_RATIO = 0.8;
const SHAKE_AMP = 6;
const SHAKE_DECAY_MS = 260;
const SHAKE_OMEGA = 0.06;
const START_MS = 200;
const CHUNK_MS = 130;
const HOLD_MS = 1500;
const RING_LENGTH = 2 * Math.PI * 36;

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데", "자리가 모자라", "한참을", "기다려야 했고", "배가 고파서", "메뉴판만", "계속", "뒤적였다", "그래도", "맛은", "기대 이상이었다", "후기를", "남기려고", "사진도", "찍어 두었다", "다음엔", "더 일찍", "와야겠다"];
const DEMO_TEXT = CHUNKS.join(" ");

const MINT: Rgb = [76, 212, 166];
const AMBER: Rgb = [250, 218, 140];
const PINK: Rgb = [255, 158, 187];

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function css(c: Rgb): string { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
function colorAt(ratio: number): string {
  const t1 = clamp((ratio - WARN_RATIO) / (1 - WARN_RATIO), 0, 1);
  const t2 = clamp((ratio - 1) / 0.1, 0, 1);
  return css(mix(mix(MINT, AMBER, t1), PINK, t2));
}
function tintAt(ratio: number, alpha: number): string {
  const t1 = clamp((ratio - WARN_RATIO) / (1 - WARN_RATIO), 0, 1);
  const t2 = clamp((ratio - 1) / 0.1, 0, 1);
  const c = mix(mix(MINT, AMBER, t1), PINK, t2);
  return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + alpha + ")";
}
function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

export default function SpringLimitRing() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const arcRef = useRef<SVGCircleElement | null>(null) as Box<SVGCircleElement | null>;
  const ringRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const countRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const hintRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const arc = arcRef.current;
    const ring = ringRef.current;
    const card = cardRef.current;
    const countEl = countRef.current;
    const hint = hintRef.current;
    const sr = srRef.current;
    if (!ta || !arc || !ring || !card || !countEl || !hint || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const countGraphemes = (s: string): number =>
      seg ? Array.from(seg.segment(s)).length : Array.from(s).length;

    let demo = true;
    let used = 0;
    let x = 0;
    let v = 0;
    let stage = 0;
    let shakeAt = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let lastDemoN = -1;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paint(nowMs: number): void {
      if (!arc || !ring || !card || !countEl || !hint) return;
      const drawn = clamp(x, 0, 1);
      arc.style.strokeDasharray = (drawn * RING_LENGTH).toFixed(2) + " " + RING_LENGTH.toFixed(2);
      arc.style.stroke = colorAt(Math.min(x, 1.12));
      card.style.background = tintAt(Math.min(x, 1.12), 0.16);
      const remain = CHAR_LIMIT - used;
      countEl.textContent = String(remain);
      countEl.style.color = remain < 0 ? "rgb(255,158,187)" : "";
      hint.textContent = remain >= 0 ? "남은 글자 " + remain + "자" : "넘친 글자 " + (-remain) + "자";
      const pulse = 1 + Math.max(0, x - 1) * 0.5;
      let dx = 0;
      if (shakeAt >= 0 && !reduce) {
        const age = nowMs - shakeAt;
        const amp = SHAKE_AMP * Math.exp(-age / SHAKE_DECAY_MS);
        dx = amp < 0.1 ? 0 : amp * Math.sin(age * SHAKE_OMEGA);
      }
      ring.style.transform = "translateX(" + dx.toFixed(2) + "px) scale(" + pulse.toFixed(3) + ")";
    }

    function update(nowMs: number): void {
      if (!ta || !sr) return;
      used = countGraphemes(ta.value);
      const ratio = used / CHAR_LIMIT;
      const next = ratio >= 1 ? 2 : (ratio >= WARN_RATIO ? 1 : 0);
      if (next !== stage) {
        if (next === 2 && !reduce) shakeAt = nowMs;
        sr.textContent = next === 2 ? "한도를 넘었어요" : (next === 1 ? "곧 한도예요" : "");
        stage = next;
      }
      if (reduce) { x = Math.min(ratio, 1); v = 0; paint(nowMs); }
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
          if (n === 1) shakeAt = -1;
          lastDemoN = n;
          ta.value = CHUNKS.slice(0, n).join(" ");
          update(now);
        }
      }
      const target = used / CHAR_LIMIT;
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let s = 0; s < steps; s += 1) {
        const a = -RING_SPRING_STIFFNESS * (x - target) - RING_SPRING_DAMPING * v;
        v += a * h;
        x += v * h;
      }
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
        <div className={styles.cc__body} ref={cardRef}>
          <div className={styles.cc__col}>
            <label className={styles.cc__label} htmlFor="ccText">메모</label>
            <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
          </div>
          <div className={styles.cc__ring} ref={ringRef}>
            <svg viewBox="0 0 88 88" aria-hidden="true">
              <circle className={styles.cc__track} cx="44" cy="44" r="36"></circle>
              <circle className={styles.cc__arc} ref={arcRef} cx="44" cy="44" r="36" transform="rotate(-90 44 44)"></circle>
            </svg>
            <div className={styles.cc__ringNum} id="ccCount" ref={countRef}>120</div>
          </div>
        </div>
        <p className={styles.cc__hint} ref={hintRef}></p>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
