// GraphemeLiveCounter — vanilla 판(01-grapheme-cluster-live-length-counter) 의 React 포트.
// 입력이 바뀔 때마다 Intl.Segmenter 로 자소 묶음 단위로 센다. 숫자는 보간, 새 칸은 스프링 오버슛.
import { useEffect, useRef } from "react";
import styles from "./GraphemeLiveCounter.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;

const STRIP_SLOTS = 16;
const POP_MS = 460;
const COUNT_LERP_RATE = 14;
const START_MS = 200;
const CHAR_MS = 150;
const HOLD_MS = 1400;
const ANNOUNCE_EVERY = 10;

const FAMILY = "👨‍👩‍👧";
const FLAG = "🇰🇷";
const CAFE = "café";
const DEMO_CHUNKS = ["하늘이 맑다 ", FAMILY, " 가족과 ", FLAG, " 여행 ", CAFE];

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

function popScale(age: number): number {
  if (age < 0 || age >= POP_MS) return 1;
  return 1 - Math.exp(-age / 70) * Math.cos(age / 55);
}

export default function GraphemeLiveCounter() {
  const rootRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const countRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const lenRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;
  const tileRefs = useRef<Array<HTMLSpanElement | null>>([]) as Box<Array<HTMLSpanElement | null>>;

  useEffect(() => {
    const ta = taRef.current;
    const countEl = countRef.current;
    const lenEl = lenRef.current;
    const sr = srRef.current;
    if (!ta || !countEl || !lenEl || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const graphemes = (s: string): string[] =>
      seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);
    const demoGraphemes = graphemes(DEMO_CHUNKS.join(""));
    const tiles = tileRefs.current;
    const born: number[] = [];
    for (let i = 0; i < STRIP_SLOTS; i += 1) born.push(-1);

    let demo = true;
    let target = 0;
    let shown = 0;
    let lenTarget = 0;
    let lenShown = 0;
    let lastCount = 0;
    let lastDemoN = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paintNumbers(): void {
      if (!countEl || !lenEl) return;
      countEl.textContent = String(Math.round(shown));
      lenEl.textContent = String(Math.round(lenShown));
    }

    function update(nowMs: number): void {
      if (!ta || !sr) return;
      const list = graphemes(ta.value);
      const count = list.length;
      const view = count <= STRIP_SLOTS ? list : list.slice(count - STRIP_SLOTS);
      for (let k = 0; k < STRIP_SLOTS; k += 1) {
        const g = view[k] || "";
        const el = tiles[k];
        if (!el) continue;
        el.textContent = g;
        el.className = [styles.cc__tile, g ? styles["is-on"] : "", g.length > 1 ? styles["is-multi"] : ""].join(" ");
      }
      if (count > lastCount && !reduce) born[Math.min(count, STRIP_SLOTS) - 1] = nowMs;
      if (count % ANNOUNCE_EVERY === 0 && count !== lastCount && count > 0) {
        sr.textContent = "현재 " + count + "자";
      }
      lastCount = count;
      target = count;
      lenTarget = ta.value.length;
      if (reduce) {
        shown = target;
        lenShown = lenTarget;
        paintNumbers();
      }
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
        const cyc = (now - START_MS) % (demoGraphemes.length * CHAR_MS + HOLD_MS);
        const n = now < START_MS ? 0 : Math.min(demoGraphemes.length, Math.floor(cyc / CHAR_MS) + 1);
        if (n !== lastDemoN) {
          lastDemoN = n;
          ta.value = demoGraphemes.slice(0, n).join("");
          update(now);
        }
      }
      const k = 1 - Math.exp(-dt * COUNT_LERP_RATE);
      shown += (target - shown) * k;
      lenShown += (lenTarget - lenShown) * k;
      paintNumbers();
      for (let m = 0; m < STRIP_SLOTS; m += 1) {
        if (born[m] < 0) continue;
        const s = popScale(now - born[m]);
        const el = tiles[m];
        if (el) el.style.transform = s === 1 ? "" : "scale(" + s.toFixed(3) + ")";
        if (s === 1) born[m] = -1;
      }
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = demoGraphemes.join("");
      update(0);
      sr.textContent = "현재 " + lastCount + "자";
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
      <div className={styles.cc} ref={rootRef}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="이모지도 넣어 보세요"></textarea>
        <div className={styles.cc__row}>
          <div className={styles.cc__big}><span className={styles.cc__num} id="ccCount" ref={countRef}>0</span><span className={styles.cc__unit}>자</span></div>
          <div className={styles.cc__sub}>length 로는 <b ref={lenRef}>0</b></div>
        </div>
        <div className={styles.cc__strip} aria-hidden="true">
          {Array.from({ length: STRIP_SLOTS }, (_, i) => (
            <span className={styles.cc__tile} key={i} ref={(el: HTMLSpanElement | null) => { tileRefs.current[i] = el; }}></span>
          ))}
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
