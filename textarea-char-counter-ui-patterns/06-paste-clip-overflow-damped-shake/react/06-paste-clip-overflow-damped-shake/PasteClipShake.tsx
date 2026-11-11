// PasteClipShake — vanilla 판(06-paste-clip-overflow-damped-shake) 의 React 포트.
// 붙여넣기가 남은 칸을 넘으면 앞부분(자소 묶음 기준)만 받고, 감쇠 사인으로 입력칸을 흔들어 잘렸다고 알린다.
import { useEffect, useRef } from "react";
import styles from "./PasteClipShake.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;

const PASTE_LIMIT = 80;
const SHAKE_AMP = 7;
const SHAKE_DECAY_MS = 240;
const SHAKE_OMEGA = 0.07;
const TOAST_MS = 1500;
const START_MS = 200;
const CHUNK_MS = 120;
const CYCLE_MS = 4800;
const PASTE_AT = [1500, 2900];

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데"];
const PASTE_SAMPLE = "그리고 후식으로 달콤한 디저트와 차까지 시켜서 천천히 먹었다";

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

export default function PasteClipShake() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const fieldRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const fillRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const countRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const toastRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const field = fieldRef.current;
    const fill = fillRef.current;
    const countEl = countRef.current;
    const toast = toastRef.current;
    const sr = srRef.current;
    if (!ta || !field || !fill || !countEl || !toast || !sr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const graphemes = (s: string): string[] =>
      seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s);

    let demo = true;
    let used = 0;
    let shown = 0;
    let shakeAt = -1;
    let toastAt = -1;
    let lastN = -1;
    let pasteDone = [false, false];
    let cycleStart = START_MS;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function paintFill(): void {
      if (!fill) return;
      fill.style.transform = "scaleX(" + Math.min(1, shown / PASTE_LIMIT).toFixed(4) + ")";
    }

    function refresh(): void {
      if (!ta || !countEl) return;
      used = graphemes(ta.value).length;
      countEl.textContent = String(used);
      if (reduce) { shown = used; paintFill(); }
    }

    function signal(dropped: number, nowMs: number): void {
      if (!toast || !sr) return;
      toast.textContent = "잘림 " + dropped + "자";
      sr.textContent = "붙여넣기가 한도를 넘어 잘렸어요";
      if (reduce) { toast.className = [styles.cc__toast, styles["is-on"]].join(" "); return; }
      shakeAt = nowMs;
      toastAt = nowMs;
    }

    function applyPaste(text: string, nowMs: number): void {
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      const room = PASTE_LIMIT - graphemes(before + after).length;
      const incoming = graphemes(text);
      const take = incoming.slice(0, Math.max(0, room)).join("");
      ta.value = before + take + after;
      ta.setSelectionRange(start + take.length, start + take.length);
      refresh();
      if (incoming.length > room) signal(incoming.length - Math.max(0, room), nowMs);
    }

    function stopDemo(): void { demo = false; }
    const onPaste = (e: ClipboardEvent): void => {
      stopDemo();
      e.preventDefault();
      applyPaste(e.clipboardData ? e.clipboardData.getData("text") : "", perfNow());
    };
    const onInput = (): void => {
      stopDemo();
      const list = graphemes(ta.value);
      if (list.length > PASTE_LIMIT) {
        ta.value = list.slice(0, PASTE_LIMIT).join("");
        signal(list.length - PASTE_LIMIT, perfNow());
      }
      refresh();
    };
    ta.addEventListener("focus", stopDemo);
    ta.addEventListener("keydown", stopDemo);
    ta.addEventListener("paste", onPaste);
    ta.addEventListener("input", onInput);

    function paintMotion(nowMs: number): void {
      if (!field || !toast) return;
      let dx = 0;
      let edge = 0;
      if (shakeAt >= 0) {
        const age = nowMs - shakeAt;
        const amp = SHAKE_AMP * Math.exp(-age / SHAKE_DECAY_MS);
        if (amp < 0.1) { shakeAt = -1; } else { dx = amp * Math.sin(age * SHAKE_OMEGA); edge = amp / SHAKE_AMP; }
      }
      field.style.transform = dx === 0 ? "" : "translateX(" + dx.toFixed(2) + "px)";
      field.style.setProperty("--edge", edge.toFixed(3));
      if (toastAt >= 0) {
        const age2 = nowMs - toastAt;
        if (age2 >= TOAST_MS) {
          toastAt = -1;
          toast.className = styles.cc__toast;
        } else {
          toast.className = [styles.cc__toast, styles["is-on"]].join(" ");
          const rise = Math.min(1, age2 / 160);
          toast.style.transform = "translateY(" + ((1 - rise) * 8).toFixed(2) + "px)";
          toast.style.opacity = String(rise);
        }
      }
    }

    function tick(ts: number): void {
      if (!ta) return;
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo && now >= START_MS) {
        let local = now - cycleStart;
        if (local >= CYCLE_MS) {
          cycleStart += CYCLE_MS;
          local = now - cycleStart;
          pasteDone = [false, false];
          lastN = -1;
          ta.value = "";
          refresh();
        }
        const n = Math.min(CHUNKS.length, Math.floor(local / CHUNK_MS) + 1);
        if (n !== lastN && local < PASTE_AT[0]) {
          lastN = n;
          ta.value = CHUNKS.slice(0, n).join(" ");
          refresh();
        }
        for (let p = 0; p < PASTE_AT.length; p += 1) {
          if (!pasteDone[p] && local >= PASTE_AT[p]) {
            pasteDone[p] = true;
            const len = ta.value.length;
            ta.setSelectionRange(len, len);
            applyPaste(PASTE_SAMPLE, now);
          }
        }
      }
      shown += (used - shown) * (1 - Math.exp(-dt * 14));
      paintFill();
      paintMotion(now);
      raf = requestAnimationFrame(tick);
    }

    if (reduce) {
      stopDemo();
      ta.value = CHUNKS.join(" ");
      const endPos = ta.value.length;
      ta.setSelectionRange(endPos, endPos);
      applyPaste(PASTE_SAMPLE, 0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ta.removeEventListener("focus", stopDemo);
      ta.removeEventListener("keydown", stopDemo);
      ta.removeEventListener("paste", onPaste);
      ta.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <label className={styles.cc__label} htmlFor="ccText">메모</label>
        <div className={styles.cc__field} ref={fieldRef}>
          <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
        </div>
        <div className={styles.cc__meter} aria-hidden="true"><i className={styles.cc__fill} ref={fillRef}></i></div>
        <div className={styles.cc__row}>
          <div className={styles.cc__big}><span className={styles.cc__num} id="ccCount" ref={countRef}>0</span><span className={styles.cc__unit}>/ 80자</span></div>
          <span className={styles.cc__toast} ref={toastRef}></span>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
