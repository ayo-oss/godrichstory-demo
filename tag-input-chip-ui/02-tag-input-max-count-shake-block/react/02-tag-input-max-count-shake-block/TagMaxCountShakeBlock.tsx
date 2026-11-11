// TagMaxCountShakeBlock — vanilla 판(run/397/demo/02-tag-input-max-count-shake-block/index.html) 의 React 포트.
// block() 이 count 를 MAX_COUNT 와 비교해 이미 한도면 칩을 만들지 않고 감쇠 스프링 shake 클래스를 다시 건다
// (키를 바꿔 리마운트시켜 CSS 애니메이션이 매번 재생되게 한다 — reflow 트릭의 React 버전).
import { useEffect, useRef, useState } from "react";
import styles from "./TagMaxCountShakeBlock.module.scss";

type Box<T> = { current: T };
type ChangeEvt = { target: { value: string } };
type KeyEvt = { key: string };

const MAX_COUNT = 5; // 계산 겹 상수: 이 개수와 매번 비교해 한도를 판정한다
const WORDS = ["할일", "진행중", "완료", "보류", "긴급"];
const OVER_WORD = "확인";
const ADD_MS = 180, PAUSE_MS = 900;

type Chip = { id: number; text: string; entering: boolean };

export default function TagMaxCountShakeBlock() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const shakeSeqRef = useRef(0) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;

  const [chips, setChips] = useState<Chip[]>([]);
  const [draft, setDraft] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [warn, setWarn] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function block() {
    // 계산 겹: 현재 개수를 MAX_COUNT 와 비교해 이미 한도라면 칩을 만들지 않고 스프링 흔들림만 재생한다
    shakeSeqRef.current++;
    setShakeKey(shakeSeqRef.current);
    setLive("태그 " + MAX_COUNT + "개 한도에 닿았다");
  }

  function add(text: string) {
    if (!text) return;
    setChips((cs) => {
      if (cs.length >= MAX_COUNT) { block(); return cs; }
      const id = seqRef.current++;
      setLive(text + " 추가 · 태그 " + (cs.length + 1) + "개");
      window.setTimeout(() => {
        setChips((cs2) => cs2.map((c) => (c.id === id ? { ...c, entering: false } : c)));
      }, 20);
      return [...cs, { id, text, entering: true }];
    });
  }

  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  useEffect(() => {
    setWarn(chips.length >= MAX_COUNT);
  }, [chips.length]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop(i: number) {
      if (!isDemoRef.current) return;
      if (i < WORDS.length) {
        add(WORDS[i]);
        timerRef.current = window.setTimeout(() => loop(i + 1), ADD_MS);
      } else if (i === WORDS.length) {
        add(OVER_WORD);
        timerRef.current = window.setTimeout(() => loop(i + 1), PAUSE_MS);
      } else {
        setChips([]);
        timerRef.current = window.setTimeout(() => loop(0), ADD_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(() => loop(0), 320);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAdd() { human(); add(draft.trim()); setDraft(""); }
  function onInput(e: ChangeEvt) { setDraft(e.target.value); }
  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" && draft.trim()) { human(); add(draft.trim()); setDraft(""); }
  }

  return (
    <main className={styles.stage}>
      <div className={styles.tm + " " + (isDemo ? styles.isDemo : "")}>
        <div key={shakeKey} className={styles.row + (shakeKey ? " " + styles.rowShake : "")}>
          {chips.map((c) => (
            <span key={c.id} className={styles.chip + (c.entering ? " " + styles.chipEnter : "")}>
              <span>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
          <input
            type="text" className={styles.input} aria-label="태그 입력, 한도에 닿으면 칸이 흔들린다"
            placeholder="태그 입력" value={draft} onChange={onInput} onKeyDown={onKeyDown}
          />
          <button type="button" className={styles.add} aria-label="태그 추가" onClick={onAdd}>+</button>
        </div>
        <p className={styles.meta}>
          태그 <b>{chips.length}</b> / <b>{MAX_COUNT}</b>
          {warn ? <span className={styles.warn}> · 한도 도달</span> : null}
        </p>
        <p className={styles.sr} role="alert">{live}</p>
      </div>
    </main>
  );
}
