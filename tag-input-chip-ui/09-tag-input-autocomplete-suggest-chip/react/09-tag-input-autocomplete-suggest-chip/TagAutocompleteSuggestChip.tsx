// TagAutocompleteSuggestChip — vanilla 판(run/397/demo/09-tag-input-autocomplete-suggest-chip/index.html) 의 React 포트.
// 계산 겹(score: 겹치는 글자 수 계산 → 점수 내림차순 재정렬)은 vanilla 와 같은 값.
import { useEffect, useRef, useState } from "react";
import styles from "./TagAutocompleteSuggestChip.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { isTrusted?: boolean };

const CANDIDATES = ["빨강", "파랑", "초록", "노랑", "보라", "주황", "하양", "검정"];
const TOP_N = 4;
const TYPE_SEQUENCE = ["파랑", "보라"];
const TYPE_MS = 130, HOLD_MS = 500, PAUSE_MS = 900;

function score(query: string, cand: string) {
  if (!query) return 0;
  const pool: { [k: string]: number } = {};
  for (let i = 0; i < query.length; i++) { const c = query[i]; pool[c] = (pool[c] || 0) + 1; }
  let s = 0;
  for (let j = 0; j < cand.length; j++) {
    const ch = cand[j];
    if (pool[ch] > 0) { s++; pool[ch]--; }
  }
  return s;
}

type Chip = { id: number; text: string; enter: boolean };

export default function TagAutocompleteSuggestChip() {
  const timerRef = useRef(0) as unknown as Box<number>;
  const seqRef = useRef(1) as unknown as Box<number>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const queryRef = useRef("") as unknown as Box<string>;

  const [chips, setChips] = useState<Chip[]>([]);
  const [query, setQuery] = useState("");
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");

  function human() {
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  const scored = CANDIDATES.map((c) => ({ text: c, score: score(query, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  function addChip(text: string) {
    const id = seqRef.current++;
    setChips((cs) => [...cs, { id, text, enter: true }]);
    window.setTimeout(() => {
      setChips((cs) => cs.map((c) => (c.id === id ? { ...c, enter: false } : c)));
    }, 20);
  }

  function removeChip(id: number) {
    human();
    setChips((cs) => cs.filter((c) => c.id !== id));
  }

  function commit(text: string) {
    addChip(text);
    setQuery("");
    queryRef.current = "";
    setLive(text + " 태그 추가");
  }

  function onInputChange(e: ChangeEvt) {
    human();
    setQuery(e.target.value);
    queryRef.current = e.target.value;
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" && query.trim()) { human(); commit(query.trim()); }
  }

  function onOptClick(text: string, e: ClickEvt) {
    if (e.isTrusted) human();
    commit(text);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setInputValue(v: string) {
      queryRef.current = v;
      setQuery(v);
    }

    function typeWord(word: string, i: number, cb: () => void) {
      if (!isDemoRef.current) return;
      if (i <= word.length) {
        setInputValue(word.slice(0, i));
        timerRef.current = window.setTimeout(() => typeWord(word, i + 1, cb), TYPE_MS);
      } else {
        timerRef.current = window.setTimeout(cb, HOLD_MS);
      }
    }

    function loop(i: number) {
      if (!isDemoRef.current) return;
      if (i < TYPE_SEQUENCE.length) {
        typeWord(TYPE_SEQUENCE[i], 0, () => {
          const leadList = CANDIDATES.map((c) => ({ text: c, score: score(queryRef.current, c) }))
            .sort((a, b) => b.score - a.score);
          const lead = leadList[0] && leadList[0].score > 0 ? leadList[0].text : TYPE_SEQUENCE[i];
          commit(lead);
          timerRef.current = window.setTimeout(() => loop(i + 1), HOLD_MS);
        });
      } else {
        setChips([]);
        timerRef.current = window.setTimeout(() => loop(0), PAUSE_MS);
      }
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(() => loop(0), 300);
    } else {
      isDemoRef.current = false;
      setIsDemo(false);
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.as + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.chips}>
          {chips.map((c) => (
            <span key={c.id} className={styles.chip + " " + (c.enter ? styles.chipEnter : "")}>
              <span>{c.text}</span>
              <button type="button" className={styles.chipX} aria-label={"태그 삭제: " + c.text} onClick={() => removeChip(c.id)}>×</button>
            </span>
          ))}
        </div>
        <div className={styles.row}>
          <input
            type="text" className={styles.input} aria-label="태그 검색, 겹치는 글자 순 추천"
            placeholder="태그 검색" value={query} onChange={onInputChange} onKeyDown={onKeyDown}
          />
        </div>
        <ul className={styles.list} role="listbox" aria-label="추천 태그">
          {scored.map((item, i) => (
            <li
              key={item.text}
              className={styles.opt + " " + (i === 0 && item.score > 0 ? styles.optLead : "")}
              role="option" tabIndex={0}
              onClick={(e: ClickEvt) => onOptClick(item.text, e)}
              onKeyDown={(e: KeyEvt) => { if (e.key === "Enter") { human(); commit(item.text); } }}
            >
              {item.text}
            </li>
          ))}
        </ul>
        <p className={styles.sr} role="status">{live}</p>
      </div>
    </main>
  );
}
