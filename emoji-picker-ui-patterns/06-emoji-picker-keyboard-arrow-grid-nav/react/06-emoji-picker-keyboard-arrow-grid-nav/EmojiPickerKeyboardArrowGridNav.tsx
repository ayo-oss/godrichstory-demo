// EmojiPickerKeyboardArrowGridNav — vanilla 판(run/402/demo/06-.../index.html) 의 React 포트.
// 계산 겹: measureCols() 가 첫 줄 칸들의 실제 렌더 top 값을 재서 지금 열 수를 구하고, move() 가
// 그 값으로 ArrowUp/Down 이 몇 칸을 건너뛸지 계산한다 — 열 수를 상수로 박아두지 않는다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiPickerKeyboardArrowGridNav.module.scss";

type Box<T> = { current: T };

const EMOJIS = [
  { ch: "\u{1F600}", name: "웃음" }, { ch: "\u{1F602}", name: "폭소" }, { ch: "\u{1F60D}", name: "하트눈" },
  { ch: "\u{1F62E}", name: "놀람" }, { ch: "\u{1F622}", name: "눈물" }, { ch: "\u{1F621}", name: "화남" },
  { ch: "\u{1F44D}", name: "좋아요" }, { ch: "\u{1F44E}", name: "싫어요" }, { ch: "\u{1F44F}", name: "박수" },
  { ch: "\u{270C}", name: "브이" }, { ch: "\u{1F64C}", name: "만세" }, { ch: "\u{1F64F}", name: "기도" },
  { ch: "\u{1F436}", name: "강아지" }, { ch: "\u{1F431}", name: "고양이" }, { ch: "\u{1F430}", name: "토끼" },
  { ch: "\u{1F984}", name: "유니콘" }, { ch: "\u{1F41D}", name: "꿀벌" }, { ch: "\u{1F419}", name: "문어" },
  { ch: "\u{1F355}", name: "피자" }, { ch: "\u{1F369}", name: "도넛" }, { ch: "\u{1F368}", name: "아이스크림" },
  { ch: "\u{1F353}", name: "딸기" }, { ch: "\u{1F34E}", name: "사과" }, { ch: "\u{1F34C}", name: "바나나" },
];

const NAV_KEYS = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];

export default function EmojiPickerKeyboardArrowGridNav() {
  const [isDemo, setIsDemo] = useState(true);
  const [focusIndex, setFocusIndexState] = useState(0);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const focusIndexRef = useRef(0) as unknown as Box<number>;
  const liveRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const gridRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const cellRefs = useRef({} as { [i: number]: HTMLButtonElement }) as unknown as Box<{ [i: number]: HTMLButtonElement }>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function measureCols(): number {
    const n = EMOJIS.length;
    if (n === 0) return 1;
    const first = cellRefs.current[0];
    if (!first) return 1;
    const firstTop = first.getBoundingClientRect().top;
    let cols = 0;
    for (let i = 0; i < n; i++) {
      const el = cellRefs.current[i];
      if (!el) break;
      if (Math.abs(el.getBoundingClientRect().top - firstTop) < 1) cols++; else break;
    }
    return cols || 1;
  }

  function setFocus(i: number, announce: boolean) {
    focusIndexRef.current = i;
    setFocusIndexState(i);
    const el = cellRefs.current[i];
    if (el) el.focus({ preventScroll: true });
    if (announce && liveRef.current) {
      const cols = measureCols();
      const row = Math.floor(i / cols) + 1;
      const col = (i % cols) + 1;
      liveRef.current.textContent = row + "번째 줄 " + col + "번째 칸, " + EMOJIS[i].name;
    }
  }

  function move(key: string) {
    const cols = measureCols();
    const cur = focusIndexRef.current;
    let next = cur;
    if (key === "ArrowRight") next = cur + 1;
    else if (key === "ArrowLeft") next = cur - 1;
    else if (key === "ArrowDown") next = cur + cols;
    else if (key === "ArrowUp") next = cur - cols;
    else if (key === "Home") next = 0;
    else if (key === "End") next = EMOJIS.length - 1;
    if (next < 0 || next >= EMOJIS.length) return;
    setFocus(next, true);
  }

  function onKeyDown(ev: { key: string; preventDefault: () => void }) {
    if (NAV_KEYS.indexOf(ev.key) === -1) return;
    ev.preventDefault();
    human();
    move(ev.key);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let si = 0;
    function runStep() {
      if (!isDemoRef.current) return;
      const key = steps[si % steps.length];
      const el = cellRefs.current[focusIndexRef.current];
      synthRef.current = true;
      if (el) el.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
      synthRef.current = false;
      si++;
      loopTimerRef.current = window.setTimeout(runStep, 640);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(runStep, 500); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => window.clearTimeout(loopTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.kg + " " + (isDemo ? styles.isDemo : "")}>
        <div
          className={styles.grid}
          role="grid"
          aria-label="이모지 격자"
          ref={gridRef}
          onKeyDown={onKeyDown}
        >
          {EMOJIS.map((e, i) => (
            <button
              key={e.name + i}
              type="button"
              className={styles.cell + " " + (focusIndex === i ? styles.cellActive : "")}
              role="gridcell"
              aria-label={e.name}
              aria-selected={focusIndex === i}
              tabIndex={focusIndex === i ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { if (el) cellRefs.current[i] = el; }}
            >
              {e.ch}
            </button>
          ))}
        </div>
        <p className={styles.sr} role="status" aria-live="polite" ref={liveRef} />
      </div>
    </main>
  );
}
