// TagDuplicateHighlightMerge — vanilla 판(run/397/demo/03-tag-input-duplicate-highlight-merge/index.html) 의 React 포트.
// findDup() 이 정규화(trim+lowercase)해 기존 칩과 견준다 — 같은 게 있으면 새로 안 만들고
// 그 칩의 merge key 를 올려 재생(리마운트)시켜 감쇠 펄스+글로우를 다시 건다.
import { useEffect, useRef, useState } from "react";
import styles from "./TagDuplicateHighlightMerge.module.scss";

type Box<T> = { current: T };
type ChangeEvt = { target: { value: string } };
type KeyEvt = { key: string };

const WORDS = ["아이디어", "초안", "아이디어", "검토"];
const ADD_MS = 620, PAUSE_MS = 900;

type Chip = { id: number; text: string; entering: boolean; mergeKey: number };

function norm(text: string): string {
  return text.trim().toLowerCase();
}

export default function TagDuplicateHighlightMerge() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const mergeSeqRef = useRef(0) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const chipsRef = useRef<Chip[]>([]) as unknown as Box<Chip[]>;

  const [chips, setChips] = useState<Chip[]>([]);
  const [draft, setDraft] = useState("");
  const [dup, setDup] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  useEffect(() => { chipsRef.current = chips; }, [chips]);

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function add(text: string) {
    if (!text) return;
    const key = norm(text);
    const found = chipsRef.current.find((c) => norm(c.text) === key);
    if (found) {
      // 계산 겹: 새 칩을 만들지 않고 있는 칩의 mergeKey 만 올려 펄스를 다시 재생한다
      mergeSeqRef.current++;
      const mk = mergeSeqRef.current;
      setChips((cs) => cs.map((c) => (c.id === found.id ? { ...c, mergeKey: mk } : c)));
      setDup(true);
      setLive(found.text + " 은 이미 있다");
      return;
    }
    setDup(false);
    const id = seqRef.current++;
    setChips((cs) => [...cs, { id, text, entering: true, mergeKey: 0 }]);
    setLive(text + " 추가 · 태그 " + (chipsRef.current.length + 1) + "개");
    window.setTimeout(() => {
      setChips((cs) => cs.map((c) => (c.id === id ? { ...c, entering: false } : c)));
    }, 20);
  }

  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function loop(i: number) {
      if (!isDemoRef.current) return;
      if (i < WORDS.length) {
        add(WORDS[i]);
        timerRef.current = window.setTimeout(() => loop(i + 1), ADD_MS);
      } else {
        setChips([]);
        setDup(false);
        timerRef.current = window.setTimeout(() => loop(0), PAUSE_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(() => loop(0), 260);
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
      <div className={styles.td + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.row}>
          {chips.map((c) => (
            <span
              key={c.id + "-" + c.mergeKey}
              className={styles.chip + (c.entering ? " " + styles.chipEnter : "") + (c.mergeKey ? " " + styles.chipMerge : "")}
            >
              <span>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
          <input
            type="text" className={styles.input} aria-label="태그 입력, 이미 있으면 새로 만들지 않고 그 칩이 빛난다"
            placeholder="태그 입력" value={draft} onChange={onInput} onKeyDown={onKeyDown}
          />
          <button type="button" className={styles.add} aria-label="태그 추가" onClick={onAdd}>+</button>
        </div>
        <p className={styles.meta}>
          태그 <b>{chips.length}</b>개
          {dup ? <span className={styles.dup}> · 이미 있음</span> : null}
        </p>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
