// EmojiPickerInsertCursorPositionPreserve — vanilla 판(run/402/demo/08-.../index.html) 의 React 포트.
// 계산 겹: 입력창이 blur 되는 순간의 selectionStart/selectionEnd 값을 저장해 두고, 이모지를
// 고르면 그 값이 가리키던 글자 사이로 되돌아가 끼워 넣는다 — 끝에 이어붙이지 않는다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiPickerInsertCursorPositionPreserve.module.scss";

type Box<T> = { current: T };

const PICKS = [
  { ch: "⭐", label: "별" },
  { ch: "\u{1F388}", label: "풍선" },
  { ch: "\u{1F4CC}", label: "압정" },
  { ch: "\u{1F340}", label: "네잎클로버" },
];

const DEMO_TEXT = "점심 진짜 맛있었어";
const MID = 5;

export default function EmojiPickerInsertCursorPositionPreserve() {
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState("");
  const [live, setLive] = useState("");
  const [popIndex, setPopIndex] = useState(-1);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const valueRef = useRef("") as unknown as Box<string>;
  const savedStartRef = useRef(0) as unknown as Box<number>;
  const savedEndRef = useRef(0) as unknown as Box<number>;
  const fieldRef = useRef(null) as unknown as Box<HTMLTextAreaElement>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const popTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function onBlur() {
    const el = fieldRef.current;
    if (!el) return;
    savedStartRef.current = el.selectionStart;
    savedEndRef.current = el.selectionEnd;
  }

  function onInput(e: { target: { value: string; selectionStart: number | null } }) {
    valueRef.current = e.target.value;
    setValue(e.target.value);
    setLive("글자 " + e.target.value.length + "개, 커서 " + (e.target.selectionStart ?? 0) + "번째");
  }

  function pick(i: number) {
    human();
    const emoji = PICKS[i].ch;
    const start = savedStartRef.current;
    const end = savedEndRef.current;
    const cur = valueRef.current;
    const before = cur.slice(0, start);
    const after = cur.slice(end);
    const next = before + emoji + after;
    valueRef.current = next;
    setValue(next);
    const landAt = start + emoji.length;
    savedStartRef.current = landAt;
    savedEndRef.current = landAt;
    setLive(before.length + "번째 글자 뒤에 끼워짐, 커서 " + landAt + "번째로 이동");
    const el = fieldRef.current;
    if (el) {
      window.setTimeout(() => {
        el.focus({ preventScroll: true });
        el.setSelectionRange(landAt, landAt);
      }, 0);
    }
    setPopIndex(i);
    window.clearTimeout(popTimerRef.current);
    popTimerRef.current = window.setTimeout(() => setPopIndex(-1), 260);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let step = 0;
    function runStep() {
      if (!isDemoRef.current) return;
      synthRef.current = true;
      if (step % 2 === 0) {
        valueRef.current = DEMO_TEXT;
        setValue(DEMO_TEXT);
        const el = fieldRef.current;
        if (el) {
          el.focus({ preventScroll: true });
          el.setSelectionRange(MID, MID);
          el.blur();
        } else {
          savedStartRef.current = MID;
          savedEndRef.current = MID;
        }
      } else {
        const idx = Math.floor(step / 2) % PICKS.length;
        pick(idx);
      }
      synthRef.current = false;
      step++;
      loopTimerRef.current = window.setTimeout(runStep, 620);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(runStep, 480); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => { window.clearTimeout(loopTimerRef.current); window.clearTimeout(popTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ip + " " + (isDemo ? styles.isDemo : "")}>
        <textarea
          className={styles.field}
          rows={3}
          aria-label="메시지 입력"
          ref={fieldRef}
          value={value}
          onChange={onInput}
          onBlur={onBlur}
        />
        <div className={styles.panel} role="group" aria-label="이모지 삽입">
          {PICKS.map((p, i) => (
            <button
              key={i}
              type="button"
              className={styles.pick + " " + (popIndex === i ? styles.pickPop : "")}
              aria-label={p.label}
              onClick={() => pick(i)}
            >
              {p.ch}
            </button>
          ))}
        </div>
        <p className={styles.sr} role="status" aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
