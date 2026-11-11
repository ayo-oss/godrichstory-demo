// AriaLiveThrottle — vanilla 판(09-aria-live-throttled-counter-reduced-motion) 의 React 포트.
// 매 입력마다 낭독하는 줄(시연용 횟수)과 임계에서만 aria-live 에 문구를 넣는 줄을 나란히 센다.
// "움직임 줄이기" 를 켜거나 OS 설정이 reduce 면 보간·팝 효과 없이 값을 즉시 그린다.
import { useEffect, useRef } from "react";
import styles from "./AriaLiveThrottle.module.scss";

type Box<T> = { current: T };
type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
type SegmenterCtor = new (locale: string | undefined, options: { granularity: string }) => SegmenterLike;
type Tick = { el: HTMLElement; on: boolean; born: number };

const ANNOUNCE_LIMIT = 100;
const ANNOUNCE_RATIOS = [0.8, 1];
const TICK_SLOTS = 20;
const POP_MS = 380;
const NUMBER_LERP_RATE = 18;
const START_MS = 200;
const CHAR_MS = 22;
const HOLD_MS = 1600;

const CHUNKS = ["오늘 저녁에", "친구들과", "새로 생긴", "식당에 가서", "따뜻한 국물과", "바삭한 튀김을", "나눠 먹기로", "했다 그런데", "자리가 모자라", "한참을", "기다려야 했고", "배가 고파서", "메뉴판만", "계속", "뒤적였다", "그래도", "맛은", "기대 이상이었다", "후기를", "남기려고", "사진도", "찍어 두었다", "다음엔", "더 일찍", "와야겠다"];
const DEMO_CHARS = Array.from(CHUNKS.join(" "));

function makeSegmenter(): SegmenterLike | null {
  const C = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return C ? new C(undefined, { granularity: "grapheme" }) : null;
}

function popScale(age: number): number {
  if (age < 0 || age >= POP_MS) return 1;
  return 1 + 1.1 * Math.exp(-age / 80) * Math.cos(age / 50);
}

export default function AriaLiveThrottle() {
  const taRef = useRef<HTMLTextAreaElement | null>(null) as Box<HTMLTextAreaElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const rawRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const safeRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;
  const rawTicksRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const safeTicksRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const srRef = useRef<HTMLParagraphElement | null>(null) as Box<HTMLParagraphElement | null>;

  useEffect(() => {
    const ta = taRef.current;
    const btn = btnRef.current;
    const rawEl = rawRef.current;
    const safeEl = safeRef.current;
    const rawBox = rawTicksRef.current;
    const safeBox = safeTicksRef.current;
    const sr = srRef.current;
    if (!ta || !btn || !rawEl || !safeEl || !rawBox || !safeBox || !sr) return;
    const osReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seg = makeSegmenter();
    const countGraphemes = (s: string): number =>
      seg ? Array.from(seg.segment(s)).length : Array.from(s).length;

    let demo = true;
    let forced = false;
    const reduced = (): boolean => osReduce || forced;

    function makeTicks(box: HTMLDivElement): Tick[] {
      const list: Tick[] = [];
      for (let i = 0; i < TICK_SLOTS; i += 1) {
        const t = document.createElement("i");
        box.appendChild(t);
        list.push({ el: t, on: false, born: -1 });
      }
      return list;
    }
    const rawList = makeTicks(rawBox);
    const safeList = makeTicks(safeBox);

    let rawCount = 0;
    let safeCount = 0;
    let rawShown = 0;
    let safeShown = 0;
    let lastLen = 0;
    let passed = [false, false];
    let lastN = -1;
    let t0: number | null = null;
    let lastTs: number | null = null;
    let raf = 0;
    const perfNow = (): number => (t0 === null ? 0 : performance.now() - t0);

    function addTick(list: Tick[], count: number, nowMs: number): void {
      const idx = Math.min(count, TICK_SLOTS) - 1;
      if (idx < 0) return;
      list[idx].on = true;
      list[idx].el.className = styles["is-on"];
      list[idx].born = reduced() ? -1 : nowMs;
    }
    function clearTicks(list: Tick[]): void {
      for (let i = 0; i < list.length; i += 1) {
        list[i].on = false;
        list[i].born = -1;
        list[i].el.className = "";
        list[i].el.style.transform = "";
      }
    }
    function paintNumbers(): void {
      if (!rawEl || !safeEl) return;
      rawEl.textContent = String(Math.round(rawShown));
      safeEl.textContent = String(Math.round(safeShown));
    }

    function update(nowMs: number): void {
      if (!ta || !sr) return;
      const len = countGraphemes(ta.value);
      if (len === 0) {
        rawCount = 0;
        safeCount = 0;
        passed = [false, false];
        clearTicks(rawList);
        clearTicks(safeList);
        lastLen = 0;
        sr.textContent = "";
        if (reduced()) { rawShown = 0; safeShown = 0; paintNumbers(); }
        return;
      }
      if (len !== lastLen) {
        rawCount += 1;
        addTick(rawList, rawCount, nowMs);
      }
      const ratio = len / ANNOUNCE_LIMIT;
      for (let i = 0; i < ANNOUNCE_RATIOS.length; i += 1) {
        if (!passed[i] && ratio >= ANNOUNCE_RATIOS[i]) {
          passed[i] = true;
          safeCount += 1;
          addTick(safeList, safeCount, nowMs);
          sr.textContent = i === 1 ? "한도를 넘었어요" : "곧 한도예요";
        }
      }
      lastLen = len;
      if (reduced()) { rawShown = rawCount; safeShown = safeCount; paintNumbers(); }
    }

    function stopDemo(): void { demo = false; }
    const onInput = (): void => { stopDemo(); update(perfNow()); };
    const onClick = (): void => {
      forced = !forced;
      btn.setAttribute("aria-pressed", forced ? "true" : "false");
      if (reduced()) { rawShown = rawCount; safeShown = safeCount; paintNumbers(); }
    };
    ta.addEventListener("focus", stopDemo);
    ta.addEventListener("keydown", stopDemo);
    ta.addEventListener("paste", stopDemo);
    ta.addEventListener("input", onInput);
    btn.addEventListener("click", onClick);

    function paintTicks(list: Tick[], nowMs: number): void {
      for (let i = 0; i < list.length; i += 1) {
        if (list[i].born < 0) continue;
        const s = popScale(nowMs - list[i].born);
        list[i].el.style.transform = s === 1 ? "" : "scaleY(" + s.toFixed(3) + ")";
        if (s === 1) list[i].born = -1;
      }
    }

    function tick(ts: number): void {
      if (!ta) return;
      if (t0 === null) t0 = ts;
      const now = ts - t0;
      const dt = lastTs === null ? 0.016 : Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (demo) {
        const cyc = (now - START_MS) % (DEMO_CHARS.length * CHAR_MS + HOLD_MS);
        const n = now < START_MS ? 0 : Math.min(DEMO_CHARS.length, Math.floor(cyc / CHAR_MS) + 1);
        while (lastN !== n) {
          lastN = n < lastN ? 0 : lastN + 1;
          ta.value = DEMO_CHARS.slice(0, lastN).join("");
          update(now);
        }
      }
      if (reduced()) {
        rawShown = rawCount;
        safeShown = safeCount;
      } else {
        const k = 1 - Math.exp(-dt * NUMBER_LERP_RATE);
        rawShown += (rawCount - rawShown) * k;
        safeShown += (safeCount - safeShown) * k;
      }
      paintNumbers();
      paintTicks(rawList, now);
      paintTicks(safeList, now);
      raf = requestAnimationFrame(tick);
    }

    if (osReduce) {
      stopDemo();
      ta.value = DEMO_CHARS.join("");
      rawCount = DEMO_CHARS.length;
      safeCount = ANNOUNCE_RATIOS.length;
      passed = [true, true];
      lastLen = DEMO_CHARS.length;
      for (let c = 1; c <= TICK_SLOTS; c += 1) addTick(rawList, c, 0);
      for (let d = 1; d <= safeCount; d += 1) addTick(safeList, d, 0);
      rawShown = rawCount;
      safeShown = safeCount;
      paintNumbers();
      sr.textContent = "한도를 넘었어요";
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ta.removeEventListener("focus", stopDemo);
      ta.removeEventListener("keydown", stopDemo);
      ta.removeEventListener("paste", stopDemo);
      ta.removeEventListener("input", onInput);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <div className={styles.cc__head}>
          <label className={styles.cc__label} htmlFor="ccText">메모</label>
          <button type="button" className={styles.cc__btn} ref={btnRef} aria-pressed="false">움직임 줄이기</button>
        </div>
        <textarea className={styles.cc__ta} id="ccText" ref={taRef} aria-describedby="ccCount" placeholder="글을 써 보세요"></textarea>
        <div className={styles.cc__lanes} id="ccCount">
          <div className={styles.cc__lane}>
            <span className={styles.cc__laneLabel}>매번 낭독</span>
            <span className={[styles.cc__laneNum, styles["cc__laneNum--raw"]].join(" ")}><b ref={rawRef}>0</b>회</span>
            <div className={styles.cc__ticks} ref={rawTicksRef} aria-hidden="true"></div>
          </div>
          <div className={styles.cc__lane}>
            <span className={styles.cc__laneLabel}>임계만 낭독</span>
            <span className={styles.cc__laneNum}><b ref={safeRef}>0</b>회</span>
            <div className={styles.cc__ticks} ref={safeTicksRef} aria-hidden="true"></div>
          </div>
        </div>
        <p className={styles.cc__sr} ref={srRef} aria-live="polite"></p>
      </div>
    </main>
  );
}
