// OverflowMirrorLayer — vanilla 판(05-overflow-mirror-layer-highlight) 의 React 포트.
// 입력칸 뒤 거울 레이어에서 한도 이후의 글자만 mark 로 감싸 분홍 배경을 칠한다. 스크롤은 거울에 그대로 복사한다.
import { useEffect, useRef } from "react";
import styles from "./OverflowMirrorLayer.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;

const MIRROR_LIMIT = 60;
const FLASH_MS = 520;
const START_MS = 200;
const CHUNK_MS = 130;
const HOLD_MS = 1500;

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데", "자리가 모자라", "한참을", "기다려야 했고", "배가 고파서", "메뉴판만", "계속", "뒤적였다", "그래도", "맛은", "기대 이상이었다", "후기를", "남기려고", "사진도", "찍어 두었다", "다음엔", "더 일찍", "와야겠다"];
const DEMO_TEXT = CHUNKS.join(" ");

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

export default function OverflowMirrorLayer() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const mirrorRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const countRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const overRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const mirror = mirrorRef.current;
    const countEl = countRef.current;
    const overEl = overRef.current;
    const sr = srRef.current;
    if (!ta || !mirror || !countEl || !overEl || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const graphemes = (s: string): string[] =>
      seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);

    let demo = true;
    let mark: HTMLElement | null = null;
    let flashAt = -1;
    let lastOver = 0;
    let stage = 0;
    let lastDemoN = -1;
    let t0: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function syncScroll(): void {
      if (!ta || !mirror) return;
      mirror.scrollTop = ta.scrollTop;
    }

    function paintMark(nowMs: number): void {
      if (!mark) return;
      const age = flashAt < 0 ? 1e9 : nowMs - flashAt;
      const a = 0.5 + 0.5 * Math.exp(-age / (FLASH_MS / 3));
      mark.style.backgroundColor = "rgba(255,158,187," + a.toFixed(3) + ")";
    }

    function update(nowMs: number): void {
      if (!ta || !mirror || !countEl || !overEl || !sr) return;
      const list = graphemes(ta.value);
      const over = Math.max(0, list.length - MIRROR_LIMIT);
      mirror.textContent = "";
      mirror.appendChild(document.createTextNode(list.slice(0, MIRROR_LIMIT).join("")));
      mark = null;
      if (over > 0) {
        mark = document.createElement("mark");
        mark.className = styles.cc__mark;
        mark.textContent = list.slice(MIRROR_LIMIT).join("");
        mirror.appendChild(mark);
      }
      mirror.appendChild(document.createTextNode("​"));
      syncScroll();
      countEl.textContent = String(list.length);
      countEl.style.color = over > 0 ? "#9a2b52" : "";
      overEl.textContent = over > 0 ? "넘침 " + over + "자" : "";
      overEl.className = [styles.cc__over, over > 0 ? styles["is-on"] : ""].join(" ");
      if (over > lastOver && !reduce) flashAt = nowMs;
      lastOver = over;
      const next = over > 0 ? 1 : 0;
      if (next !== stage) {
        sr.textContent = next === 1 ? "한도를 넘었어요" : "";
        stage = next;
      }
      if (mark) paintMark(reduce ? 1e9 : nowMs);
    }

    function stopDemo(): void { demo = false; }
    const onInput = (): void => { stopDemo(); update(perfNow()); };
    ta.addEventListener("focus", stopDemo);
    ta.addEventListener("keydown", stopDemo);
    ta.addEventListener("paste", stopDemo);
    ta.addEventListener("input", onInput);
    ta.addEventListener("scroll", syncScroll);

    function tick(ts: number): void {
      if (!ta) return;
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      if (demo) {
        const cyc = (now - START_MS) % (CHUNKS.length * CHUNK_MS + HOLD_MS);
        const n = now < START_MS ? 0 : Math.min(CHUNKS.length, Math.floor(cyc / CHUNK_MS) + 1);
        if (n !== lastDemoN) {
          lastDemoN = n;
          ta.value = CHUNKS.slice(0, n).join(" ");
          ta.scrollTop = ta.scrollHeight;
          update(now);
        }
      }
      paintMark(now);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = DEMO_TEXT;
      ta.scrollTop = ta.scrollHeight;
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
      ta.removeEventListener("scroll", syncScroll);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <div className={styles.cc__field}>
          <div className={styles.cc__mirror} ref={mirrorRef} aria-hidden="true"></div>
          <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
        </div>
        <div className={styles.cc__row}>
          <div className={styles.cc__big}><span className={styles.cc__num} id="ccCount" ref={countRef}>0</span><span className={styles.cc__unit}>/ 60자</span></div>
          <span className={styles.cc__over} ref={overRef}></span>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
