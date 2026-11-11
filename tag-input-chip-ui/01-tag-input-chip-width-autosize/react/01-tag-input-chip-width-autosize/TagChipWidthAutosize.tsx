// TagChipWidthAutosize — vanilla 판(run/397/demo/01-tag-input-chip-width-autosize/index.html) 의 React 포트.
// applyWidth() 가 키 입력마다 WIDTH_PER_CHAR 어림값을 즉시 적용하고, 다음 프레임에 canvas measureText 로
// 잰 실제 글리프 폭으로 보정한다. reduce 에서도 input/keydown 은 render() 를 즉시 한 번 부른다.
import { useEffect, useRef, useState } from "react";
import styles from "./TagChipWidthAutosize.module.scss";

type Box<T> = { current: T };
type ChangeEvt = { target: { value: string } };
type KeyEvt = { key: string };

const WIDTH_PER_CHAR = 6.4; // 계산 겹 상수: 정밀 측정 전 즉시 보여줄 어림 폭(글자당 px)
const CH_PAD = 24;
const MIN_W = 32, MAX_W = 208;
const WORDS = ["프로토타입", "와이어프레임", "초안"];
const TYPE_MS = 130, HOLD_MS = 560, GAP_MS = 420;

type Chip = { id: number; text: string; entering: boolean };

export default function TagChipWidthAutosize() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const draftTextRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const canvasRef = useRef(null) as unknown as Box<HTMLCanvasElement | null>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;

  const [chips, setChips] = useState<Chip[]>([{ id: 0, text: "리서치", entering: false }]);
  const [draft, setDraft] = useState("");
  const [draftW, setDraftW] = useState(MIN_W);
  const [measuredW, setMeasuredW] = useState(0);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("태그 1개");

  function measureWidth(text: string): number {
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx || !draftTextRef.current) return text.length * WIDTH_PER_CHAR;
    const cs = window.getComputedStyle(draftTextRef.current);
    ctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return ctx.measureText(text).width;
  }

  function render(text: string) {
    const guess = Math.min(MAX_W, Math.max(MIN_W, text.length * WIDTH_PER_CHAR + CH_PAD));
    setDraft(text);
    setDraftW(guess);
    setMeasuredW(Math.round(guess));
    requestAnimationFrame(() => {
      const real = Math.min(MAX_W, Math.max(MIN_W, measureWidth(text) + CH_PAD));
      setDraftW(real);
      setMeasuredW(Math.round(real));
    });
  }

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function commit(text: string) {
    if (!text) return;
    const id = seqRef.current++;
    setChips((cs) => [...cs, { id, text, entering: true }]);
    window.setTimeout(() => {
      setChips((cs) => cs.map((c) => (c.id === id ? { ...c, entering: false } : c)));
    }, 20);
  }

  useEffect(() => {
    setLive("태그 " + chips.length + "개");
  }, [chips.length]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function typeLoop(wi: number, ci: number) {
      if (!isDemoRef.current) return;
      const word = WORDS[wi % WORDS.length];
      if (ci <= word.length) {
        render(word.slice(0, ci));
        timerRef.current = window.setTimeout(() => typeLoop(wi, ci + 1), TYPE_MS);
      } else {
        timerRef.current = window.setTimeout(() => {
          if (!isDemoRef.current) return;
          commit(word);
          render("");
          timerRef.current = window.setTimeout(() => typeLoop(wi + 1, 0), GAP_MS);
        }, HOLD_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(() => typeLoop(0, 0), 320);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onInput(e: ChangeEvt) {
    human();
    render(e.target.value);
  }
  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" && draft.trim()) {
      human();
      commit(draft.trim());
      render("");
    }
  }
  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <main className={styles.stage}>
      <div className={styles.ti + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.row}>
          {chips.map((c) => (
            <span key={c.id} className={styles.chip + (c.entering ? " " + styles.chipEnter : "")}>
              <span className={styles.chipText}>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
          <span className={styles.draft} style={{ width: draftW + "px" }} aria-hidden="true">
            <span className={styles.draftText} ref={draftTextRef}>{draft}</span>
            <span className={styles.caret} />
          </span>
          <input
            type="text" className={styles.input} aria-label="태그 입력, 글자 수만큼 칩 폭이 늘어난다"
            placeholder="태그 입력" ref={inputRef} value={draft} onChange={onInput} onKeyDown={onKeyDown}
          />
        </div>
        <p className={styles.meta}>측정 폭 <b>{measuredW}</b>px · 글자 <b>{draft.length}</b>자</p>
        <p className={styles.sr} role="status" aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
