// TextStatsMeter — vanilla 판(07-chars-words-bytes-reading-time-meter) 의 React 포트.
// 같은 텍스트에서 글자·단어·바이트·읽는 시간을 함께 계산하고, 네 숫자가 목표값을 향해 굴러간다.
import { useEffect, useRef } from "react";
import styles from "./TextStatsMeter.module.scss";

type Box<T> = { current: T };
type SegItem = { segment: string; isWordLike?: boolean };
type SegmenterLike = { segment(s: string): Iterable<SegItem> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;

const READ_CHARS_PER_MIN = 500;
const NUMBER_LERP_RATE = 12;
const ANNOUNCE_EVERY = 50;
const START_MS = 200;
const CHUNK_MS = 130;
const HOLD_MS = 1500;
const BAR_CAPS = [150, 30, 450, 20];

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데", "자리가 모자라", "한참을", "기다려야 했고", "배가 고파서", "메뉴판만", "계속", "뒤적였다", "그래도", "맛은", "기대 이상이었다", "후기를", "남기려고", "사진도", "찍어 두었다", "다음엔", "더 일찍", "와야겠다"];
const DEMO_TEXT = CHUNKS.join(" ");

function makeSegmenter(granularity: string): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity }) : null;
}

export default function TextStatsMeter() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const outRefs = useRef<Array<HTMLElement | null>>([null, null, null, null]) as Box<Array<HTMLElement | null>>;
  const barRefs = useRef<Array<HTMLElement | null>>([null, null, null, null]) as Box<Array<HTMLElement | null>>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const sr = srRef.current;
    if (!ta || !sr) return;
    const outs = outRefs.current;
    const bars = barRefs.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gSeg = makeSegmenter("grapheme");
    const wSeg = makeSegmenter("word");
    const enc = new TextEncoder();

    function measure(text: string): number[] {
      const chars = gSeg ? Array.from(gSeg.segment(text)).length : Array.from(text).length;
      const words = wSeg
        ? Array.from(wSeg.segment(text)).filter((x) => x.isWordLike).length
        : text.split(/\s+/).filter(Boolean).length;
      const bytes = enc.encode(text).length;
      const secs = Math.ceil(chars / READ_CHARS_PER_MIN * 60);
      return [chars, words, bytes, secs];
    }

    let demo = true;
    let target = [0, 0, 0, 0];
    let shown = [0, 0, 0, 0];
    let lastAnnounce = 0;
    let lastN = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;

    function paint(): void {
      for (let i = 0; i < 4; i += 1) {
        const o = outs[i];
        const b = bars[i];
        if (o) o.textContent = String(Math.round(shown[i]));
        const fraction = Math.min(1, shown[i] / BAR_CAPS[i]);
        if (b) {
          b.style.transform = "scaleX(" + fraction.toFixed(4) + ")";
          const tile = b.parentElement;
          if (tile) tile.style.setProperty("--fill", fraction.toFixed(4));
        }
      }
    }

    function update(): void {
      if (!ta || !sr) return;
      target = measure(ta.value);
      const bucket = Math.floor(target[0] / ANNOUNCE_EVERY);
      if (bucket !== lastAnnounce) {
        lastAnnounce = bucket;
        if (bucket > 0) sr.textContent = "현재 " + target[0] + "자";
      }
      if (reduce) { shown = target.slice(); paint(); }
    }

    function stopDemo(): void { demo = false; }
    const onInput = (): void => { stopDemo(); update(); };
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
          update();
        }
      }
      const k = 1 - Math.exp(-dt * NUMBER_LERP_RATE);
      for (let i = 0; i < 4; i += 1) shown[i] += (target[i] - shown[i]) * k;
      paint();
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = DEMO_TEXT;
      update();
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

  function setOut(i: number) { return (el: HTMLElement | null): void => { outRefs.current[i] = el; }; }
  function setBar(i: number) { return (el: HTMLElement | null): void => { barRefs.current[i] = el; }; }

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
        <div className={styles.cc__tiles} id="ccCount">
          <div className={[styles.cc__tile, styles["cc__tile--chars"]].join(" ")}><span className={styles.cc__tileLabel}>글자</span><span className={styles.cc__num} ref={setOut(0)}>0</span><i className={styles.cc__bar} ref={setBar(0)}></i></div>
          <div className={[styles.cc__tile, styles["cc__tile--words"]].join(" ")}><span className={styles.cc__tileLabel}>단어</span><span className={styles.cc__num} ref={setOut(1)}>0</span><i className={styles.cc__bar} ref={setBar(1)}></i></div>
          <div className={[styles.cc__tile, styles["cc__tile--bytes"]].join(" ")}><span className={styles.cc__tileLabel}>바이트</span><span className={styles.cc__num} ref={setOut(2)}>0</span><i className={styles.cc__bar} ref={setBar(2)}></i></div>
          <div className={[styles.cc__tile, styles["cc__tile--time"]].join(" ")}><span className={styles.cc__tileLabel}>읽는 시간</span><span className={styles.cc__num}><b ref={setOut(3)}>0</b><small>초</small></span><i className={styles.cc__bar} ref={setBar(3)}></i></div>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
